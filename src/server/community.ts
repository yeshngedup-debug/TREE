import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  communityContentTypeLabels,
  excerptOf,
  loginSchema,
  postCreateSchema,
  signupSchema,
  slugifyTitle,
  type CommunityAccount,
  type CommunityCategory,
  type CommunityComment,
  type CommunityContentType,
  type CommunityEngagement,
  type CommunityModerationOverview,
  type CommunityPost,
  type CommunityPostList,
  type CommunityPostSummary,
  type CommunityReport,
  type CommunityReportReason,
  type ModerationAction,
  type PostQuery,
} from "@/lib/community";
import {
  queryRows,
  consumeRate,
  syncCommunityPostLeaf,
  transaction,
  usingSqlite,
} from "@/server/db";
import { cookieValue, isAdmin } from "@/server/auth";
import { AppError } from "@/server/http";
import { requestIp } from "@/server/request-ip";

export { requestIp };

export const COMMUNITY_COOKIE = "bi_community";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const SCRYPT_KEY_LENGTH = 64;

function scrypt(
  password: string,
  salt: string,
  keylen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

type SignupInput = z.infer<typeof signupSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type PostCreateInput = z.infer<typeof postCreateSchema>;
type ProfilePatch = {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
};

type AccountRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  role: string;
  status: string;
  created_at: unknown;
};

type AccountWithSecret = AccountRow & {
  password_hash: string;
  password_salt: string;
};

type PostRow = {
  id: string;
  slug: string;
  author_id: string;
  title: string;
  body: string;
  content_type: string;
  category_slug: string;
  category_label: string;
  image_url: string;
  featured: number | string | boolean;
  created_at: unknown;
  updated_at: unknown;
  like_count: number | string;
  comment_count: number | string;
  username: string;
  display_name: string;
  avatar_url: string;
  author_bio: string;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const raw = String(value ?? "");
  if (!raw) return "";
  // SQLite's datetime() drops the timezone marker; the value is UTC.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw))
    return `${raw.replace(" ", "T")}Z`;
  return raw;
}

function toAccount(row: AccountRow): CommunityAccount {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    bio: String(row.bio ?? ""),
    avatarUrl: String(row.avatar_url ?? ""),
    role: (row.role as CommunityAccount["role"]) ?? "member",
    createdAt: toIso(row.created_at),
  };
}

function accountPublicFields() {
  return "id, username, display_name, bio, avatar_url, role, status, created_at";
}

function isUniqueViolation(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return (
    candidate?.code === "23505" ||
    /unique constraint failed/i.test(candidate?.message ?? "")
  );
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEY_LENGTH);
  return { salt, hash: derived.toString("hex") };
}

async function passwordMatches(
  password: string,
  salt: string,
  storedHash: string,
) {
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEY_LENGTH);
  const expected = Buffer.from(storedHash, "hex");
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

export async function createAccount(
  input: SignupInput,
): Promise<CommunityAccount> {
  const existing = await queryRows<{ id: string }>(
    "select id from community_accounts where username=$1",
    [input.username],
  );
  if (existing.length)
    throw new AppError(
      "That username is already taken.",
      409,
      "USERNAME_TAKEN",
    );
  const { salt, hash } = await hashPassword(input.password);
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    await queryRows(
      `insert into community_accounts(id,username,display_name,bio,avatar_url,password_hash,password_salt,role,status,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,'member','active',$8,$9)`,
      [
        id,
        input.username,
        input.displayName,
        input.bio ?? "",
        input.avatarUrl ?? "",
        hash,
        salt,
        now,
        now,
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError(
        "That username is already taken.",
        409,
        "USERNAME_TAKEN",
      );
    throw error;
  }
  return {
    id,
    username: input.username,
    displayName: input.displayName,
    bio: input.bio ?? "",
    avatarUrl: input.avatarUrl ?? "",
    role: "member",
    createdAt: now,
  };
}

export async function authenticate(
  input: LoginInput,
): Promise<CommunityAccount | null> {
  const rows = await queryRows<AccountWithSecret>(
    `select ${accountPublicFields()}, password_hash, password_salt
     from community_accounts where username=$1`,
    [input.username],
  );
  const row = rows[0];
  if (!row || row.status !== "active") return null;
  const valid = await passwordMatches(
    input.password,
    String(row.password_salt),
    String(row.password_hash),
  );
  return valid ? toAccount(row) : null;
}

export async function startSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = Date.now();
  await queryRows("delete from community_sessions where expires <= $1", [now]);
  await queryRows(
    "insert into community_sessions(token_hash,account_id,created_at,expires) values($1,$2,$3,$4)",
    [tokenHash, accountId, new Date(now).toISOString(), now + SESSION_MAX_AGE * 1000],
  );
  return { token, maxAge: SESSION_MAX_AGE };
}

export async function endSession(token: string) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await queryRows("delete from community_sessions where token_hash=$1", [
    tokenHash,
  ]);
}

export async function accountForToken(
  token: string,
): Promise<CommunityAccount | null> {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await queryRows<AccountRow>(
    `select ${accountPublicFields().replace(/(^|, )/g, "$1a.")}
     from community_sessions s
     join community_accounts a on a.id=s.account_id
     where s.token_hash=$1 and s.expires > $2 and a.status='active'`,
    [tokenHash, Date.now()],
  );
  return rows[0] ? toAccount(rows[0]) : null;
}

export function accountForRequest(request: Request) {
  return accountForToken(cookieValue(request, COMMUNITY_COOKIE) ?? "");
}

export function communityCookie(
  request: Request,
  value: string,
  maxAge: number,
) {
  return `${COMMUNITY_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    new URL(request.url).protocol === "https:" ? "; Secure" : ""
  }`;
}

export async function rateLimit(
  key: string,
  maximum: number,
  windowMs: number,
) {
  const result = await consumeRate(key, maximum, windowMs);
  if (!result.allowed) {
    const minutes = Math.max(1, Math.ceil(result.retryAfter / 60));
    throw new AppError(
      `Too many requests. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      "RATE_LIMITED",
    );
  }
}

export async function accountById(id: string) {
  const rows = await queryRows<AccountRow>(
    `select ${accountPublicFields()} from community_accounts where id=$1`,
    [id],
  );
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function accountByUsername(username: string) {
  const rows = await queryRows<AccountRow>(
    `select ${accountPublicFields()} from community_accounts
     where username=$1 and status='active'`,
    [username.toLowerCase()],
  );
  return rows[0] ? toAccount(rows[0]) : null;
}

export async function changePassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean }> {
  const account = await accountById(accountId);
  if (!account) return { success: false };
  // accountById returns CommunityAccount without password fields;
  // fetch the secret from the DB directly.
  const secretRow = await queryRows<{ password_hash: string; password_salt: string }>(
    `select password_hash, password_salt from community_accounts where id=$1`,
    [accountId],
  );
  if (!secretRow.length) return { success: false };
  const valid = await passwordMatches(
    currentPassword,
    String(secretRow[0].password_salt),
    String(secretRow[0].password_hash),
  );
  if (!valid) return { success: false };
  if (newPassword.length < 8) return { success: false };
  const { salt, hash } = await hashPassword(newPassword);
  await queryRows(
    `update community_accounts set password_hash=$1, password_salt=$2, updated_at=$3 where id=$4`,
    [hash, salt, new Date().toISOString(), accountId],
  );
  return { success: true };
}

export async function requestPasswordReset(
  usernameOrEmail: string,
): Promise<{ success: boolean; token?: string }> {
  const account = await accountByUsername(usernameOrEmail);
  if (!account) return { success: false };
  const token = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  try {
    await queryRows(
      `insert into password_resets(token,account_id,expires) values($1,$2,$3)`,
      [token, account.id, expires],
    );
    return { success: true, token };
  } catch (error) {
    console.error("Password reset request failed:", error);
    return { success: false };
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ success: boolean }> {
  const row = await queryRows<{ id: string }>(
    `select id from password_resets where token=$1 and expires > $2`,
    [token, new Date()],
  );
  if (!row.length) return { success: false };
  const accountId = row[0].id;
  if (newPassword.length < 8) return { success: false };
  const { salt, hash } = await hashPassword(newPassword);
  await queryRows(
    `update community_accounts set password_hash=$1, password_salt=$2, updated_at=$3 where id=$4`,
    [hash, salt, new Date().toISOString(), accountId],
  );
  try {
    await queryRows(`delete from password_resets where token=$1`, [token]);
  } catch {
    /* best-effort cleanup */
  }
  return { success: true };
}

export async function updateProfile(
  accountId: string,
  patch: ProfilePatch,
): Promise<CommunityAccount> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (patch.displayName !== undefined)
    sets.push(`display_name=${push(patch.displayName)}`);
  if (patch.bio !== undefined) sets.push(`bio=${push(patch.bio)}`);
  if (patch.avatarUrl !== undefined)
    sets.push(`avatar_url=${push(patch.avatarUrl)}`);
  sets.push(`updated_at=${push(new Date().toISOString())}`);
  params.push(accountId);
  await queryRows(
    `update community_accounts set ${sets.join(", ")} where id=$${params.length}`,
    params,
  );
  const account = await accountById(accountId);
  if (!account)
    throw new AppError("That account no longer exists.", 404, "NOT_FOUND");
  return account;
}

export type CommunityCategoryCount = CommunityCategory & {
  postCount: number;
};

export async function listCategories(): Promise<CommunityCategoryCount[]> {
  const rows = await queryRows<{
    slug: string;
    label: string;
    description: string;
    sort_order: number | string;
    post_count: number | string;
  }>(
    `select c.slug, c.label, c.description, c.sort_order,
            count(p.id) as post_count
     from community_categories c
     left join community_posts p
       on p.category_slug=c.slug and p.status='published'
     group by c.slug, c.label, c.description, c.sort_order
     order by c.sort_order asc, c.label asc`,
  );
  return rows.map((row) => ({
    slug: String(row.slug),
    label: String(row.label),
    description: String(row.description ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    postCount: Number(row.post_count ?? 0),
  }));
}

export async function popularTags(limit = 12) {
  const rows = await queryRows<{ tag_slug: string; uses: number | string }>(
    `select pt.tag_slug, count(*) as uses
     from community_post_tags pt
     join community_posts p on p.id=pt.post_id and p.status='published'
     group by pt.tag_slug
     order by uses desc, pt.tag_slug asc
     limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    slug: String(row.tag_slug),
    uses: Number(row.uses ?? 0),
  }));
}

const postSelect = `
  select p.id, p.slug, p.author_id, p.title, p.body, p.content_type,
         p.category_slug, p.image_url, p.featured, p.created_at, p.updated_at,
         p.like_count, p.comment_count,
         c.label as category_label,
         a.username, a.display_name, a.avatar_url, a.bio as author_bio
  from community_posts p
  join community_accounts a on a.id=p.author_id
  join community_categories c on c.slug=p.category_slug`;

function mapSummary(row: PostRow, tags: string[]): CommunityPostSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: excerptOf(String(row.body)),
    contentType: row.content_type as CommunityContentType,
    category: {
      slug: String(row.category_slug),
      label: String(row.category_label),
    },
    tags,
    imageUrl: String(row.image_url ?? ""),
    author: {
      username: String(row.username),
      displayName: String(row.display_name),
      avatarUrl: String(row.avatar_url ?? ""),
      bio: String(row.author_bio ?? ""),
    },
    createdAt: toIso(row.created_at),
    likeCount: Number(row.like_count ?? 0),
    commentCount: Number(row.comment_count ?? 0),
    featured: Boolean(Number(row.featured ?? 0)),
  };
}

async function tagsFor(posts: string[]) {
  const tags = new Map<string, string[]>();
  if (!posts.length) return tags;
  const placeholders = posts.map((_, index) => `$${index + 1}`).join(",");
  const rows = await queryRows<{ post_id: string; tag_slug: string }>(
    `select post_id, tag_slug from community_post_tags
     where post_id in (${placeholders}) order by tag_slug asc`,
    posts,
  );
  for (const row of rows) {
    const list = tags.get(String(row.post_id)) ?? [];
    list.push(String(row.tag_slug));
    tags.set(String(row.post_id), list);
  }
  return tags;
}

export async function listPosts(query: PostQuery): Promise<CommunityPostList> {
  const params: unknown[] = [];
  const push = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const where = ["p.status='published'"];
  if (query.q) {
    where.push(
      usingSqlite
        ? `instr(p.search_text, ${push(query.q.toLowerCase())}) > 0`
        : `to_tsvector('simple', p.search_text) @@ plainto_tsquery('simple', ${push(query.q)})`,
    );
  }
  if (query.type) where.push(`p.content_type=${push(query.type)}`);
  if (query.category) where.push(`p.category_slug=${push(query.category)}`);
  if (query.tag)
    where.push(
      `exists (select 1 from community_post_tags pt where pt.post_id=p.id and pt.tag_slug=${push(query.tag)})`,
    );
  const whereSql = where.join(" and ");
  const totals = await queryRows<{ total: number | string }>(
    `select count(*) as total from community_posts p where ${whereSql}`,
    params,
  );
  const total = Number(totals[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  if (!total)
    return { posts: [], total, page: query.page, pageSize: query.pageSize, pages };

  const order =
    query.sort === "popular"
      ? "p.like_count desc, p.comment_count desc, p.created_at desc, p.id desc"
      : "p.created_at desc, p.id desc";
  const limit = push(query.pageSize);
  const offset = push((query.page - 1) * query.pageSize);
  const rows = await queryRows<PostRow>(
    `${postSelect} where ${whereSql} order by ${order} limit ${limit} offset ${offset}`,
    params,
  );
  const tagMap = await tagsFor(rows.map((row) => String(row.id)));
  return {
    posts: rows.map((row) => mapSummary(row, tagMap.get(String(row.id)) ?? [])),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pages,
  };
}

export async function getPost(slug: string): Promise<CommunityPost | null> {
  const rows = await queryRows<PostRow>(
    `${postSelect} where p.slug=$1 and p.status='published'`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;
  const tagMap = await tagsFor([String(row.id)]);
  return {
    ...mapSummary(row, tagMap.get(String(row.id)) ?? []),
    body: String(row.body),
    updatedAt: toIso(row.updated_at),
  };
}

export async function relatedPosts(post: CommunityPost, limit = 3) {
  const rows = await queryRows<PostRow>(
    `${postSelect}
     where p.status='published' and p.id<>$1 and p.category_slug=$2
     order by p.created_at desc limit $3`,
    [post.id, post.category.slug, limit],
  );
  const tagMap = await tagsFor(rows.map((row) => String(row.id)));
  return rows.map((row) =>
    mapSummary(row, tagMap.get(String(row.id)) ?? []),
  );
}

export async function postsByAuthor(username: string, limit = 60) {
  const rows = await queryRows<PostRow>(
    `${postSelect}
     where a.username=$1 and p.status='published'
     order by p.created_at desc, p.id desc limit $2`,
    [username.toLowerCase(), limit],
  );
  const tagMap = await tagsFor(rows.map((row) => String(row.id)));
  return rows.map((row) =>
    mapSummary(row, tagMap.get(String(row.id)) ?? []),
  );
}

export async function postCounts(accountId: string) {
  const rows = await queryRows<{
    total: number | string;
    aspirations: number | string;
    ideas: number | string;
  }>(
    `select count(*) as total,
            coalesce(sum(case when content_type='aspiration' then 1 else 0 end),0) as aspirations,
            coalesce(sum(case when content_type='idea' then 1 else 0 end),0) as ideas
     from community_posts where author_id=$1 and status='published'`,
    [accountId],
  );
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    aspirations: Number(row?.aspirations ?? 0),
    ideas: Number(row?.ideas ?? 0),
  };
}

export async function communityStats() {
  const rows = await queryRows<{
    posts: number | string;
    aspirations: number | string;
    ideas: number | string;
  }>(
    `select count(*) as posts,
            coalesce(sum(case when content_type='aspiration' then 1 else 0 end),0) as aspirations,
            coalesce(sum(case when content_type='idea' then 1 else 0 end),0) as ideas
     from community_posts where status='published'`,
  );
  const members = await queryRows<{ count: number | string }>(
    "select count(*) as count from community_accounts where status='active'",
  );
  return {
    posts: Number(rows[0]?.posts ?? 0),
    aspirations: Number(rows[0]?.aspirations ?? 0),
    ideas: Number(rows[0]?.ideas ?? 0),
    members: Number(members[0]?.count ?? 0),
  };
}

export async function createPost(
  account: CommunityAccount,
  input: PostCreateInput,
): Promise<CommunityPost> {
  const categories = await queryRows<{ slug: string }>(
    "select slug from community_categories where slug=$1",
    [input.category],
  );
  if (!categories.length)
    throw new AppError("Choose a category from the list.", 400, "BAD_CATEGORY");

  const base = slugifyTitle(input.title);
  let slug = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    const taken = await queryRows<{ id: string }>(
      "select id from community_posts where slug=$1",
      [slug],
    );
    if (!taken.length) break;
    slug = `${base}-${randomBytes(3).toString("hex")}`;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const searchText = [
    input.title,
    input.body,
    input.category.replace(/-/g, " "),
    input.tags.join(" "),
    account.displayName,
    account.username,
    communityContentTypeLabels[input.contentType],
  ]
    .join(" ")
    .toLowerCase();

  try {
    await transaction(async (client) => {
      await client.query(
        `insert into community_posts(id,slug,author_id,title,body,content_type,category_slug,image_url,status,search_text,like_count,comment_count,created_at,updated_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,'published',$9,0,0,$10,$11)`,
        [
          id,
          slug,
          account.id,
          input.title,
          input.body,
          input.contentType,
          input.category,
          input.imageUrl ?? "",
          searchText,
          now,
          now,
        ],
      );
      for (const tag of input.tags) {
        await client.query(
          "insert into community_tags(slug,label,created_at) values($1,$1,$2) on conflict(slug) do nothing",
          [tag, now],
        );
        await client.query(
          `insert into community_post_tags(post_id,tag_slug) values($1,$2)
           on conflict(post_id,tag_slug) do nothing`,
          [id, tag],
        );
      }
      await syncCommunityPostLeaf(client, {
        id,
        title: input.title,
        body: input.body,
        categorySlug: input.category,
        status: "published",
        createdAt: now,
      });
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const retrySlug = `${base}-${randomUUID().slice(0, 8)}`;
    await transaction(async (client) => {
      await client.query(
        `insert into community_posts(id,slug,author_id,title,body,content_type,category_slug,image_url,status,search_text,like_count,comment_count,created_at,updated_at)
         values($1,$2,$3,$4,$5,$6,$7,$8,'published',$9,0,0,$10,$11)`,
        [
          id,
          retrySlug,
          account.id,
          input.title,
          input.body,
          input.contentType,
          input.category,
          input.imageUrl ?? "",
          searchText,
          now,
          now,
        ],
      );
      for (const tag of input.tags) {
        await client.query(
          "insert into community_tags(slug,label,created_at) values($1,$1,$2) on conflict(slug) do nothing",
          [tag, now],
        );
        await client.query(
          `insert into community_post_tags(post_id,tag_slug) values($1,$2)
           on conflict(post_id,tag_slug) do nothing`,
          [id, tag],
        );
      }
      await syncCommunityPostLeaf(client, {
        id,
        title: input.title,
        body: input.body,
        categorySlug: input.category,
        status: "published",
        createdAt: now,
      });
    });
    slug = retrySlug;
  }

  const created = await getPost(slug);
  if (!created)
    throw new AppError(
      "Your post could not be opened after publishing.",
      500,
      "SERVER_ERROR",
    );
  return created;
}

export type ModerationActor = {
  kind: "staff" | "account";
  id: string;
  label: string;
  /**
   * A staff session or a community admin may manage people and taxonomy.
   * Moderators keep post, comment, report and feature controls.
   */
  role: "staff" | "moderator" | "admin";
};

export function canManageCommunity(actor: ModerationActor | null) {
  return Boolean(actor && (actor.kind === "staff" || actor.role === "admin"));
}

async function assertCategory(slug: string) {
  const rows = await queryRows<{ slug: string }>(
    "select slug from community_categories where slug=$1",
    [slug],
  );
  if (!rows.length)
    throw new AppError("Choose a category from the list.", 400, "BAD_CATEGORY");
}

function buildSearchText(input: PostCreateInput, account: CommunityAccount) {
  return [
    input.title,
    input.body,
    input.category.replace(/-/g, " "),
    input.tags.join(" "),
    account.displayName,
    account.username,
    communityContentTypeLabels[input.contentType],
  ]
    .join(" ")
    .toLowerCase();
}

async function postFromRow(row: PostRow): Promise<CommunityPost> {
  const tagMap = await tagsFor([String(row.id)]);
  return {
    ...mapSummary(row, tagMap.get(String(row.id)) ?? []),
    body: String(row.body),
    updatedAt: toIso(row.updated_at),
  };
}

export async function getOwnPost(
  slug: string,
  accountId: string,
): Promise<CommunityPost | null> {
  const rows = await queryRows<PostRow>(
    `${postSelect} where p.slug=$1 and p.author_id=$2 and p.status='published'`,
    [slug, accountId],
  );
  return rows[0] ? postFromRow(rows[0]) : null;
}

export async function updatePost(
  account: CommunityAccount,
  slug: string,
  input: PostCreateInput,
): Promise<CommunityPost> {
  const rows = await queryRows<{ id: string; created_at: unknown }>(
    `select id, created_at from community_posts
     where slug=$1 and author_id=$2 and status='published'`,
    [slug, account.id],
  );
  const existing = rows[0];
  if (!existing)
    throw new AppError(
      "That post was not found, or you cannot edit it.",
      404,
      "NOT_FOUND",
    );
  await assertCategory(input.category);
  const now = new Date().toISOString();
  const searchText = buildSearchText(input, account);
  const id = String(existing.id);

  await transaction(async (client) => {
    await client.query(
      `update community_posts
       set title=$1, body=$2, content_type=$3, category_slug=$4, image_url=$5,
           search_text=$6, updated_at=$7
       where id=$8 and author_id=$9`,
      [
        input.title,
        input.body,
        input.contentType,
        input.category,
        input.imageUrl ?? "",
        searchText,
        now,
        id,
        account.id,
      ],
    );
    await client.query("delete from community_post_tags where post_id=$1", [id]);
    for (const tag of input.tags) {
      await client.query(
        "insert into community_tags(slug,label,created_at) values($1,$1,$2) on conflict(slug) do nothing",
        [tag, now],
      );
      await client.query(
        `insert into community_post_tags(post_id,tag_slug) values($1,$2)
         on conflict(post_id,tag_slug) do nothing`,
        [id, tag],
      );
    }
    await syncCommunityPostLeaf(client, {
      id,
      title: input.title,
      body: input.body,
      categorySlug: input.category,
      status: "published",
      createdAt: toIso(existing.created_at) || now,
    });
  });

  const updated = await getPost(slug);
  if (!updated)
    throw new AppError(
      "Your post could not be reopened after saving.",
      500,
      "SERVER_ERROR",
    );
  return updated;
}

export async function removePost(account: CommunityAccount, slug: string) {
  const rows = await queryRows<{
    id: string;
    title: string;
    body: string;
    category_slug: string;
    created_at: unknown;
  }>(
    `select id, title, body, category_slug, created_at from community_posts
     where slug=$1 and author_id=$2 and status='published'`,
    [slug, account.id],
  );
  const post = rows[0];
  if (!post)
    throw new AppError(
      "That post was not found, or you cannot remove it.",
      404,
      "NOT_FOUND",
    );
  const now = new Date().toISOString();
  await transaction(async (client) => {
    await client.query(
      "update community_posts set status='removed', featured=0, updated_at=$1 where id=$2",
      [now, String(post.id)],
    );
    await syncCommunityPostLeaf(client, {
      id: String(post.id),
      title: String(post.title),
      body: String(post.body),
      categorySlug: String(post.category_slug),
      status: "removed",
      createdAt: toIso(post.created_at) || now,
    });
  });
  return { removed: true };
}

async function publishedPost(slug: string) {
  const rows = await queryRows<{ id: string; like_count: number | string }>(
    "select id, like_count from community_posts where slug=$1 and status='published'",
    [slug],
  );
  const post = rows[0];
  if (!post)
    throw new AppError("That post was not found.", 404, "NOT_FOUND");
  return post;
}

export async function toggleLike(
  accountId: string,
  slug: string,
): Promise<CommunityEngagement> {
  const post = await publishedPost(slug);
  return transaction(async (client) => {
    const existing = (
      await client.query(
        "select 1 as found from community_likes where post_id=$1 and account_id=$2",
        [String(post.id), accountId],
      )
    ).rows as unknown[];
    let liked: boolean;
    if (existing.length) {
      await client.query(
        "delete from community_likes where post_id=$1 and account_id=$2",
        [String(post.id), accountId],
      );
      await client.query(
        `update community_posts
         set like_count=case when like_count > 0 then like_count - 1 else 0 end
         where id=$1`,
        [String(post.id)],
      );
      liked = false;
    } else {
      const inserted = await client.query(
        `insert into community_likes(post_id,account_id,created_at) values($1,$2,$3)
         on conflict(post_id,account_id) do nothing`,
        [String(post.id), accountId, new Date().toISOString()],
      );
      if (inserted.rowCount) {
        await client.query(
          "update community_posts set like_count=like_count+1 where id=$1",
          [String(post.id)],
        );
      }
      liked = true;
    }
    const counts = (
      await client.query("select like_count from community_posts where id=$1", [
        String(post.id),
      ])
    ).rows as { like_count: number | string }[];
    const bookmarked = (
      await client.query(
        "select 1 as found from community_bookmarks where post_id=$1 and account_id=$2",
        [String(post.id), accountId],
      )
    ).rows as unknown[];
    return {
      liked,
      bookmarked: bookmarked.length > 0,
      likeCount: Number(counts[0]?.like_count ?? 0),
    };
  });
}

export async function toggleBookmark(accountId: string, slug: string) {
  const post = await publishedPost(slug);
  const existing = await queryRows<{ found: number }>(
    "select 1 as found from community_bookmarks where post_id=$1 and account_id=$2",
    [String(post.id), accountId],
  );
  if (existing.length) {
    await queryRows(
      "delete from community_bookmarks where post_id=$1 and account_id=$2",
      [String(post.id), accountId],
    );
    return { bookmarked: false };
  }
  await queryRows(
    `insert into community_bookmarks(post_id,account_id,created_at) values($1,$2,$3)
     on conflict(post_id,account_id) do nothing`,
    [String(post.id), accountId, new Date().toISOString()],
  );
  return { bookmarked: true };
}

export async function engagementFor(
  accountId: string | null,
  postId: string,
): Promise<CommunityEngagement> {
  const counts = await queryRows<{ like_count: number | string }>(
    "select like_count from community_posts where id=$1",
    [postId],
  );
  const likeCount = Number(counts[0]?.like_count ?? 0);
  if (!accountId) return { liked: false, bookmarked: false, likeCount };
  const likes = await queryRows<{ found: number }>(
    "select 1 as found from community_likes where post_id=$1 and account_id=$2",
    [postId, accountId],
  );
  const bookmarks = await queryRows<{ found: number }>(
    "select 1 as found from community_bookmarks where post_id=$1 and account_id=$2",
    [postId, accountId],
  );
  return {
    liked: likes.length > 0,
    bookmarked: bookmarks.length > 0,
    likeCount,
  };
}

export async function listSavedPosts(
  accountId: string,
): Promise<CommunityPostSummary[]> {
  const rows = await queryRows<PostRow>(
    `${postSelect}
     join community_bookmarks b on b.post_id=p.id
     where b.account_id=$1 and p.status='published'
     order by b.created_at desc, p.id desc limit 100`,
    [accountId],
  );
  const tagMap = await tagsFor(rows.map((row) => String(row.id)));
  return rows.map((row) =>
    mapSummary(row, tagMap.get(String(row.id)) ?? []),
  );
}

export async function featuredPosts(limit = 3) {
  const rows = await queryRows<PostRow>(
    `${postSelect}
     where p.status='published' and p.featured=1
     order by p.created_at desc, p.id desc limit $1`,
    [limit],
  );
  const tagMap = await tagsFor(rows.map((row) => String(row.id)));
  return rows.map((row) =>
    mapSummary(row, tagMap.get(String(row.id)) ?? []),
  );
}

export async function listComments(postId: string): Promise<CommunityComment[]> {
  const rows = await queryRows<{
    id: string;
    post_id: string;
    body: string;
    created_at: unknown;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  }>(
    `select c.id, c.post_id, c.body, c.created_at,
            a.username, a.display_name, a.avatar_url, a.bio
     from community_comments c
     join community_accounts a on a.id=c.author_id
     where c.post_id=$1 and c.status='published'
     order by c.created_at asc, c.id asc limit 200`,
    [postId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    postId: String(row.post_id),
    body: String(row.body),
    author: {
      username: String(row.username),
      displayName: String(row.display_name),
      avatarUrl: String(row.avatar_url ?? ""),
      bio: String(row.bio ?? ""),
    },
    createdAt: toIso(row.created_at),
  }));
}

export async function createComment(
  account: CommunityAccount,
  slug: string,
  body: string,
): Promise<CommunityComment> {
  const post = await publishedPost(slug);
  const id = randomUUID();
  const now = new Date().toISOString();
  await transaction(async (client) => {
    await client.query(
      `insert into community_comments(id,post_id,author_id,body,status,created_at)
       values($1,$2,$3,$4,'published',$5)`,
      [id, String(post.id), account.id, body, now],
    );
    await client.query(
      "update community_posts set comment_count=comment_count+1 where id=$1",
      [String(post.id)],
    );
  });
  return {
    id,
    postId: String(post.id),
    body,
    author: {
      username: account.username,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      bio: account.bio,
    },
    createdAt: now,
  };
}

export async function deleteComment(
  account: CommunityAccount,
  commentId: string,
) {
  const rows = await queryRows<{
    id: string;
    post_id: string;
    author_id: string;
    status: string;
  }>(
    "select id, post_id, author_id, status from community_comments where id=$1",
    [commentId],
  );
  const comment = rows[0];
  if (!comment || String(comment.author_id) !== account.id)
    throw new AppError(
      "That comment was not found, or you cannot delete it.",
      404,
      "NOT_FOUND",
    );
  if (String(comment.status) === "published") {
    await transaction(async (client) => {
      await client.query(
        "update community_comments set status='removed' where id=$1",
        [commentId],
      );
      await client.query(
        `update community_posts
         set comment_count=case when comment_count > 0 then comment_count - 1 else 0 end
         where id=$1`,
        [String(comment.post_id)],
      );
    });
  }
  return { removed: true };
}

async function insertReport(
  account: CommunityAccount,
  target: { postId?: string; commentId?: string },
  reason: CommunityReportReason,
  detail: string,
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const existing = target.postId
    ? await queryRows<{ id: string }>(
        "select id from community_reports where post_id=$1 and reporter_id=$2",
        [target.postId, account.id],
      )
    : await queryRows<{ id: string }>(
        "select id from community_reports where comment_id=$1 and reporter_id=$2",
        [target.commentId, account.id],
      );
  if (existing.length)
    throw new AppError(
      "You already reported this. Our moderators will review it.",
      409,
      "ALREADY_REPORTED",
    );
  try {
    await transaction(async (client) => {
      await client.query(
        `insert into community_reports(id,post_id,comment_id,reporter_id,reason,detail,status,created_at)
         values($1,$2,$3,$4,$5,$6,'open',$7)`,
        [
          id,
          target.postId ?? null,
          target.commentId ?? null,
          account.id,
          reason,
          detail,
          now,
        ],
      );
      await client.query(
        `insert into community_moderation(id,actor_kind,actor_id,action,target_kind,target_id,note,created_at)
         values($1,'account',$2,'report',$3,$4,$5,$6)`,
        [
          randomUUID(),
          account.id,
          target.postId ? "post" : "comment",
          target.postId ?? target.commentId,
          reason,
          now,
        ],
      );
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError(
        "You already reported this. Our moderators will review it.",
        409,
        "ALREADY_REPORTED",
      );
    throw error;
  }
  return { reported: true };
}

export async function reportPost(
  account: CommunityAccount,
  slug: string,
  reason: CommunityReportReason,
  detail: string,
) {
  const post = await publishedPost(slug);
  return insertReport(account, { postId: String(post.id) }, reason, detail);
}

export async function reportComment(
  account: CommunityAccount,
  commentId: string,
  reason: CommunityReportReason,
  detail: string,
) {
  const rows = await queryRows<{ id: string; status: string }>(
    "select id, status from community_comments where id=$1",
    [commentId],
  );
  if (!rows[0] || String(rows[0].status) !== "published")
    throw new AppError("That comment was not found.", 404, "NOT_FOUND");
  return insertReport(account, { commentId }, reason, detail);
}

export function isModeratorAccount(account: CommunityAccount | null) {
  return Boolean(
    account && (account.role === "admin" || account.role === "moderator"),
  );
}

export async function moderatorForRequest(
  request: Request,
): Promise<ModerationActor | null> {
  // Staff authority wins when both sessions are present so a staff member can
  // always act, even against the account that happens to be signed in.
  if (isAdmin(request))
    return {
      kind: "staff",
      id: "",
      label: "Staff console",
      role: "staff",
    };
  const account = await accountForRequest(request);
  if (account && isModeratorAccount(account))
    return {
      kind: "account",
      id: account.id,
      label: `@${account.username}`,
      role: account.role === "admin" ? "admin" : "moderator",
    };
  return null;
}

export async function moderationOverview(): Promise<CommunityModerationOverview> {
  const countRows = await queryRows<{
    open_reports: number | string;
    hidden_posts: number | string;
    hidden_comments: number | string;
    suspended_accounts: number | string;
  }>(
    `select
       (select count(*) from community_reports where status='open') as open_reports,
       (select count(*) from community_posts where status='hidden') as hidden_posts,
       (select count(*) from community_comments where status<>'published') as hidden_comments,
       (select count(*) from community_accounts where status='suspended') as suspended_accounts`,
  );

  const reportRows = await queryRows<{
    id: string;
    reason: string;
    detail: string;
    status: string;
    created_at: unknown;
    reporter_username: string;
    reporter_name: string;
    post_slug: string | null;
    post_title: string | null;
    post_status: string | null;
    comment_id: string | null;
    comment_body: string | null;
    comment_status: string | null;
    comment_post_slug: string | null;
  }>(
    `select r.id, r.reason, r.detail, r.status, r.created_at,
            a.username as reporter_username, a.display_name as reporter_name,
            p.slug as post_slug, p.title as post_title, p.status as post_status,
            c.id as comment_id, c.body as comment_body, c.status as comment_status,
            cp.slug as comment_post_slug
     from community_reports r
     join community_accounts a on a.id=r.reporter_id
     left join community_posts p on p.id=r.post_id
     left join community_comments c on c.id=r.comment_id
     left join community_posts cp on cp.id=c.post_id
     order by case when r.status='open' then 0 else 1 end, r.created_at desc
     limit 100`,
  );

  const postRows = await queryRows<{
    slug: string;
    title: string;
    status: string;
    featured: number | string | boolean;
    created_at: unknown;
    username: string;
    report_count: number | string;
  }>(
    `select p.slug, p.title, p.status, p.featured, p.created_at, a.username,
            (select count(*) from community_reports r
             where r.post_id=p.id and r.status='open') as report_count
     from community_posts p
     join community_accounts a on a.id=p.author_id
     order by case when p.status='published' then 0 else 1 end,
              p.created_at desc, p.id desc
     limit 80`,
  );

  const commentRows = await queryRows<{
    id: string;
    body: string;
    status: string;
    created_at: unknown;
    username: string;
    post_slug: string;
    post_title: string;
  }>(
    `select c.id, c.body, c.status, c.created_at, a.username,
            p.slug as post_slug, p.title as post_title
     from community_comments c
     join community_accounts a on a.id=c.author_id
     join community_posts p on p.id=c.post_id
     where c.status<>'published'
     order by c.created_at desc, c.id desc limit 80`,
  );

  const accountRows = await queryRows<{
    username: string;
    display_name: string;
    role: string;
    status: string;
    created_at: unknown;
    post_count: number | string;
  }>(
    `select a.username, a.display_name, a.role, a.status, a.created_at,
            (select count(*) from community_posts p
             where p.author_id=a.id and p.status='published') as post_count
     from community_accounts a
     order by case when a.status='suspended' then 0 else 1 end,
              a.created_at desc
     limit 100`,
  );

  const recentRows = await queryRows<{
    id: string;
    actor_kind: string;
    actor_id: string;
    action: string;
    target_kind: string;
    target_id: string;
    note: string;
    created_at: unknown;
    username: string | null;
  }>(
    `select m.id, m.actor_kind, m.actor_id, m.action, m.target_kind,
            m.target_id, m.note, m.created_at, a.username
     from community_moderation m
     left join community_accounts a on a.id=m.actor_id
     order by m.created_at desc, m.id desc limit 30`,
  );

  return {
    counts: {
      openReports: Number(countRows[0]?.open_reports ?? 0),
      hiddenPosts: Number(countRows[0]?.hidden_posts ?? 0),
      hiddenComments: Number(countRows[0]?.hidden_comments ?? 0),
      suspendedAccounts: Number(countRows[0]?.suspended_accounts ?? 0),
    },
    reports: reportRows.map((row) => ({
      id: String(row.id),
      reason: row.reason as CommunityReportReason,
      detail: String(row.detail ?? ""),
      status: row.status as CommunityReport["status"],
      createdAt: toIso(row.created_at),
      reporter: {
        username: String(row.reporter_username),
        displayName: String(row.reporter_name),
      },
      post: row.post_slug
        ? {
            slug: String(row.post_slug),
            title: String(row.post_title ?? ""),
            status: String(row.post_status ?? ""),
          }
        : null,
      comment: row.comment_id
        ? {
            id: String(row.comment_id),
            body: String(row.comment_body ?? ""),
            status: String(row.comment_status ?? ""),
            postSlug: String(row.comment_post_slug ?? ""),
          }
        : null,
    })),
    posts: postRows.map((row) => ({
      slug: String(row.slug),
      title: String(row.title),
      status: String(row.status),
      featured: Boolean(Number(row.featured ?? 0)),
      author: String(row.username),
      createdAt: toIso(row.created_at),
      reportCount: Number(row.report_count ?? 0),
    })),
    comments: commentRows.map((row) => ({
      id: String(row.id),
      body: String(row.body),
      status: String(row.status),
      postSlug: String(row.post_slug),
      postTitle: String(row.post_title),
      author: String(row.username),
      createdAt: toIso(row.created_at),
    })),
    accounts: accountRows.map((row) => ({
      username: String(row.username),
      displayName: String(row.display_name),
      role: row.role as CommunityModerationOverview["accounts"][number]["role"],
      status: row.status as "active" | "suspended",
      postCount: Number(row.post_count ?? 0),
      createdAt: toIso(row.created_at),
    })),
    categories: await listCategories(),
    recent: recentRows.map((row) => ({
      id: String(row.id),
      actorKind: row.actor_kind as "staff" | "account",
      actorLabel:
        row.actor_kind === "staff"
          ? "Staff console"
          : row.username
            ? `@${String(row.username)}`
            : "Deleted account",
      action: String(row.action),
      targetKind: String(row.target_kind),
      targetId: String(row.target_id),
      note: String(row.note ?? ""),
      createdAt: toIso(row.created_at),
    })),
  };
}

async function logModeration(
  actor: ModerationActor,
  action: string,
  targetKind: string,
  targetId: string,
  note: string,
) {
  await queryRows(
    `insert into community_moderation(id,actor_kind,actor_id,action,target_kind,target_id,note,created_at)
     values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      randomUUID(),
      actor.kind,
      actor.id,
      action,
      targetKind,
      targetId,
      note,
      new Date().toISOString(),
    ],
  );
}

const managementActions = new Set<ModerationAction["action"]>([
  "account_status",
  "account_role",
  "category",
]);

export async function applyModerationAction(
  actor: ModerationActor,
  input: ModerationAction,
) {
  // A moderator can curate content, but only staff or an admin may change
  // roles, suspend people or rewrite the category vocabulary. Without this
  // gate a moderator could promote a colluder and escalate their own reach.
  if (managementActions.has(input.action) && !canManageCommunity(actor))
    throw new AppError(
      "Only staff or a community admin can manage people and categories.",
      403,
      "FORBIDDEN",
    );

  if (input.action === "post_status") {
    const rows = await queryRows<{
      id: string;
      title: string;
      body: string;
      category_slug: string;
      created_at: unknown;
    }>(
      `select id, title, body, category_slug, created_at
       from community_posts where slug=$1`,
      [input.target],
    );
    const post = rows[0];
    if (!post)
      throw new AppError("That post was not found.", 404, "NOT_FOUND");
    const now = new Date().toISOString();
    await transaction(async (client) => {
      await client.query(
        `update community_posts
         set status=$1, featured=case when $1='published' then featured else 0 end,
             updated_at=$2
         where id=$3`,
        [input.status, now, String(post.id)],
      );
      await syncCommunityPostLeaf(
        client,
        {
          id: String(post.id),
          title: String(post.title),
          body: String(post.body),
          categorySlug: String(post.category_slug),
          status: input.status,
          createdAt: toIso(post.created_at) || now,
        },
        { restore: input.status === "published" },
      );
    });
    await logModeration(
      actor,
      "post_status",
      "post",
      input.target,
      `${input.status}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "comment_status") {
    const rows = await queryRows<{
      id: string;
      post_id: string;
      status: string;
    }>("select id, post_id, status from community_comments where id=$1", [
      input.target,
    ]);
    const comment = rows[0];
    if (!comment)
      throw new AppError("That comment was not found.", 404, "NOT_FOUND");
    const wasPublished = String(comment.status) === "published";
    const willPublish = input.status === "published";
    await transaction(async (client) => {
      await client.query("update community_comments set status=$1 where id=$2", [
        input.status,
        input.target,
      ]);
      if (wasPublished !== willPublish) {
        const delta = willPublish ? 1 : -1;
        await client.query(
          `update community_posts
           set comment_count=case
             when comment_count + $1 < 0 then 0
             else comment_count + $1
           end
           where id=$2`,
          [delta, String(comment.post_id)],
        );
      }
    });
    await logModeration(
      actor,
      "comment_status",
      "comment",
      input.target,
      `${input.status}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "feature") {
    const rows = await queryRows<{ slug: string; status: string }>(
      "select slug, status from community_posts where slug=$1",
      [input.target],
    );
    const post = rows[0];
    if (!post)
      throw new AppError("That post was not found.", 404, "NOT_FOUND");
    if (post.status !== "published")
      throw new AppError(
        "Only published posts can be featured.",
        400,
        "NOT_PUBLISHED",
      );
    await queryRows("update community_posts set featured=$1 where slug=$2", [
      input.featured ? 1 : 0,
      input.target,
    ]);
    await logModeration(
      actor,
      "feature",
      "post",
      input.target,
      `${input.featured ? "featured" : "unfeatured"}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "report_status") {
    const rows = await queryRows<{ id: string }>(
      "select id from community_reports where id=$1",
      [input.target],
    );
    if (!rows[0])
      throw new AppError("That report was not found.", 404, "NOT_FOUND");
    await queryRows(
      "update community_reports set status=$1, resolved_at=$2 where id=$3",
      [input.status, new Date().toISOString(), input.target],
    );
    await logModeration(
      actor,
      "report_status",
      "report",
      input.target,
      `${input.status}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "account_status") {
    const rows = await queryRows<{ id: string; username: string }>(
      "select id, username from community_accounts where username=$1",
      [input.target.toLowerCase()],
    );
    const account = rows[0];
    if (!account)
      throw new AppError("That account was not found.", 404, "NOT_FOUND");
    if (actor.kind === "account" && actor.id === String(account.id))
      throw new AppError(
        "You cannot change your own account status.",
        400,
        "SELF_ACTION",
      );
    await queryRows(
      "update community_accounts set status=$1, updated_at=$2 where id=$3",
      [input.status, new Date().toISOString(), String(account.id)],
    );
    if (input.status === "suspended")
      await queryRows("delete from community_sessions where account_id=$1", [
        String(account.id),
      ]);
    await logModeration(
      actor,
      "account_status",
      "account",
      input.target,
      `${input.status}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "account_role") {
    const rows = await queryRows<{ id: string; username: string }>(
      "select id, username from community_accounts where username=$1",
      [input.target.toLowerCase()],
    );
    const account = rows[0];
    if (!account)
      throw new AppError("That account was not found.", 404, "NOT_FOUND");
    if (actor.kind === "account" && actor.id === String(account.id))
      throw new AppError(
        "You cannot change your own role.",
        400,
        "SELF_ACTION",
      );
    await queryRows(
      "update community_accounts set role=$1, updated_at=$2 where id=$3",
      [input.role, new Date().toISOString(), String(account.id)],
    );
    await logModeration(
      actor,
      "account_role",
      "account",
      input.target,
      `${input.role}${input.note ? `: ${input.note}` : ""}`,
    );
  } else if (input.action === "category") {
    await queryRows(
      `insert into community_categories(slug,label,description,sort_order,created_at)
       values($1,$2,$3,120,$4)
       on conflict(slug) do update set label=$2, description=$3`,
      [input.slug, input.label, input.description, new Date().toISOString()],
    );
    await logModeration(
      actor,
      "category",
      "category",
      input.slug,
      `${input.label}${input.note ? `: ${input.note}` : ""}`,
    );
  }
  return moderationOverview();
}

export async function sitemapEntries() {
  const posts = await queryRows<{ slug: string; updated_at: unknown }>(
    `select slug, updated_at from community_posts
     where status='published' order by updated_at desc limit 5000`,
  );
  const profiles = await queryRows<{
    username: string;
    last_post: unknown;
  }>(
    `select a.username, max(p.updated_at) as last_post
     from community_accounts a
     join community_posts p on p.author_id=a.id and p.status='published'
     where a.status='active'
     group by a.username
     order by last_post desc limit 2000`,
  );
  return {
    posts: posts.map((row) => ({
      slug: String(row.slug),
      updatedAt: toIso(row.updated_at),
    })),
    profiles: profiles.map((row) => ({
      username: String(row.username),
      updatedAt: toIso(row.last_post),
    })),
  };
}
