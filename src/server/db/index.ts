import { randomBytes, randomUUID, createHash, createCipheriv, createDecipheriv } from "node:crypto";
import { Pool, PoolClient, type QueryResult } from "pg";
import {
  themes,
  themeFor,
  type Leaf,
  type Theme,
  type TreeStats,
  type Reflection,
  type TreeSnapshot,
} from "@/lib/catalog";
import {
  treeSettingsSchema,
  defaultTreeSettings,
  type TreeSettings,
} from "@/lib/tree-settings";
import {
  communityCategorySeeds,
  communityLeafMessage,
  leafThemeForCategory,
} from "@/lib/community";
import { leafCursorFilter } from "@/lib/leaf-cursor";
import {
  query as sqliteQuery,
  transaction as sqliteTransaction,
  getSessionSecret as sqliteGetSessionSecret,
  db as sqliteDb,
  closeDb as sqliteCloseDb,
} from "../db-sqlite";

let dbInitError: Error | null = null;
let pool: Pool | null = null;
let sessionSecretValue = "";

const useSqlite = Boolean(process.env.DATABASE_PATH);

export function databaseProvider(): "sqlite" | "postgres" {
  return useSqlite ? "sqlite" : "postgres";
}

if (useSqlite) {
  sessionSecretValue = sqliteGetSessionSecret();
} else {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  pool = pgPool;
  // Neon closes idle connections server-side. Without this listener an error
  // emitted by an idle client is unhandled and would take the Node process
  // down; the pool discards the broken client and the next query reconnects.
  pgPool.on("error", (error) => {
    console.error(
      "Idle PostgreSQL connection failed:",
      error instanceof Error ? error.message : String(error),
    );
  });

  const initSql = `
      create extension if not exists pgcrypto;

      create table if not exists approved_leaves (
        id text primary key,
        idempotency_key text not null unique,
        category text not null check (category in ('nature','innovation','education','community','wellbeing','culture')),
        leaf_message text not null default '',
        chamber_id integer not null check (chamber_id between 1 and 4),
        chamber_reason text not null,
        created_at timestamptz not null default now(),
        status text not null default 'approved' check (status in ('approved','hidden')),
        mode text not null default 'offline',
        is_demo integer not null default 0,
        payload_hash text not null default ''
      );

      -- Databases created by an earlier schema version are missing this column.
      alter table approved_leaves
        add column if not exists leaf_message text not null default '';

      create index if not exists leaves_public_order on approved_leaves(status, created_at desc, id desc);

      create table if not exists app_meta (
        key text primary key,
        value text not null
      );

      create table if not exists password_resets (
        token text primary key,
        account_id text not null references community_accounts(id) on delete cascade,
        expires bigint not null
      );

      create table if not exists rate_limits (
        key text primary key,
        count integer not null,
        expires bigint not null
      );

      create table if not exists audit_events (
        id serial primary key,
        action text not null,
        leaf_id text,
        created_at timestamptz not null default now()
      );

      create table if not exists reflection_cache (
        id integer primary key check (id = 1),
        body text not null,
        mode text not null,
        created_at timestamptz not null default now(),
        source_revision integer not null
      );

      create table if not exists metrics (
        key text primary key,
        count integer not null default 0
      );

      create table if not exists visitor_submissions (
        id text primary key,
        idempotency_key text not null unique,
        leaf_id text,
        private_message text not null,
        selected_theme text not null,
        outcome text not null check (outcome in ('approved','rejected')),
        reason text not null default '',
        created_at timestamptz not null default now(),
        private_reply text not null default '',
        owner_key text not null default '',
        visit_kind text not null default 'first'
      );

      create index if not exists visitor_submissions_order on visitor_submissions(created_at desc, id desc);

      create table if not exists visitor_profiles (
        id text primary key,
        cid_hash text not null unique,
        pin_salt text not null,
        pin_hash text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists visitor_profile_leaves (
        leaf_id text primary key,
        profile_id text not null,
        linked_at timestamptz not null default now()
      );

      create index if not exists visitor_profile_leaves_profile on visitor_profile_leaves(profile_id, linked_at desc);

      create table if not exists visitor_profile_sessions (
        token_hash text primary key,
        profile_id text not null,
        expires bigint not null
      );

      -- Community identity. Deliberately separate from visitor_profiles:
      -- a visitor profile is a private CID/PIN history, an account is a
      -- public author identity for published aspirations and ideas.
      create table if not exists community_accounts (
        id text primary key,
        username text not null unique,
        display_name text not null,
        bio text not null default '',
        avatar_url text not null default '',
        password_hash text not null,
        password_salt text not null,
        role text not null default 'member' check (role in ('member','moderator','admin')),
        status text not null default 'active' check (status in ('active','suspended')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists community_sessions (
        token_hash text primary key,
        account_id text not null references community_accounts(id) on delete cascade,
        created_at timestamptz not null default now(),
        expires bigint not null
      );

      create index if not exists community_sessions_account on community_sessions(account_id);

      create table if not exists community_categories (
        slug text primary key,
        label text not null,
        description text not null default '',
        sort_order integer not null default 0,
        created_at timestamptz not null default now()
      );

      create table if not exists community_posts (
        id text primary key,
        slug text not null unique,
        author_id text not null references community_accounts(id) on delete cascade,
        title text not null,
        body text not null,
        content_type text not null check (content_type in ('aspiration','idea')),
        category_slug text not null references community_categories(slug),
        image_url text not null default '',
        status text not null default 'published' check (status in ('published','hidden','removed')),
        search_text text not null default '',
        like_count integer not null default 0,
        comment_count integer not null default 0,
        featured integer not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      -- Databases created before community curation existed need the flag.
      alter table community_posts
        add column if not exists featured integer not null default 0;

      create index if not exists community_posts_feed on community_posts(status, created_at desc, id desc);
      create index if not exists community_posts_category on community_posts(category_slug, status, created_at desc);
      create index if not exists community_posts_author on community_posts(author_id, status, created_at desc);
      create index if not exists community_posts_featured on community_posts(featured, status, created_at desc);
      create index if not exists community_posts_type_feed on community_posts(content_type, status, created_at desc, id desc);
      create index if not exists community_posts_search on community_posts using gin (to_tsvector('simple', search_text));

      create table if not exists community_tags (
        slug text primary key,
        label text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists community_post_tags (
        post_id text not null references community_posts(id) on delete cascade,
        tag_slug text not null references community_tags(slug) on delete cascade,
        primary key (post_id, tag_slug)
      );

      create index if not exists community_post_tags_tag on community_post_tags(tag_slug, post_id);

      create table if not exists community_likes (
        post_id text not null references community_posts(id) on delete cascade,
        account_id text not null references community_accounts(id) on delete cascade,
        created_at timestamptz not null default now(),
        primary key (post_id, account_id)
      );

      create index if not exists community_likes_account on community_likes(account_id, created_at desc);

      create table if not exists community_bookmarks (
        post_id text not null references community_posts(id) on delete cascade,
        account_id text not null references community_accounts(id) on delete cascade,
        created_at timestamptz not null default now(),
        primary key (post_id, account_id)
      );

      create index if not exists community_bookmarks_account on community_bookmarks(account_id, created_at desc);

      create table if not exists community_comments (
        id text primary key,
        post_id text not null references community_posts(id) on delete cascade,
        author_id text not null references community_accounts(id) on delete cascade,
        body text not null,
        status text not null default 'published' check (status in ('published','hidden','removed')),
        created_at timestamptz not null default now()
      );

      create index if not exists community_comments_post on community_comments(post_id, status, created_at asc);
      create index if not exists community_comments_author on community_comments(author_id, created_at desc);

      create table if not exists community_reports (
        id text primary key,
        post_id text references community_posts(id) on delete cascade,
        comment_id text references community_comments(id) on delete cascade,
        reporter_id text not null references community_accounts(id) on delete cascade,
        reason text not null check (reason in ('spam','harassment','misinformation','unsafe','other')),
        detail text not null default '',
        status text not null default 'open' check (status in ('open','resolved','dismissed')),
        created_at timestamptz not null default now(),
        resolved_at timestamptz,
        check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
      );

      create index if not exists community_reports_status on community_reports(status, created_at asc);
      create unique index if not exists community_reports_post_unique on community_reports(post_id, reporter_id) where post_id is not null;
      create unique index if not exists community_reports_comment_unique on community_reports(comment_id, reporter_id) where comment_id is not null;

      create table if not exists community_moderation (
        id text primary key,
        actor_kind text not null check (actor_kind in ('staff','account')),
        actor_id text not null default '',
        action text not null,
        target_kind text not null,
        target_id text not null,
        note text not null default '',
        created_at timestamptz not null default now()
      );

      create index if not exists community_moderation_target on community_moderation(target_kind, target_id, created_at desc);

      -- One tree leaf per published community post. The link table keeps the
      -- existing approved_leaves table as the single source of truth for the
      -- 3D tree while letting a post change without losing its leaf history.
      create table if not exists community_tree_leaves (
        post_id text primary key references community_posts(id) on delete cascade,
        leaf_id text not null unique,
        linked_at timestamptz not null default now()
      );

      create index if not exists community_tree_leaves_leaf on community_tree_leaves(leaf_id);

      insert into app_meta (key, value) values ('revision', '0') on conflict (key) do nothing;
    `;

  const initialize = async () => {
    // No parameters here: node-postgres only uses the simple query protocol
    // (which accepts multiple statements) when no values are passed.
    await pgPool.query(initSql);
    // Seeded once; a later admin-edited category label must survive restarts.
    for (const category of communityCategorySeeds) {
      await pgPool.query(
        "insert into community_categories(slug,label,description,sort_order) values($1,$2,$3,$4) on conflict(slug) do nothing",
        [
          category.slug,
          category.label,
          category.description,
          category.sortOrder,
        ],
      );
    }
    await backfillCommunityLeaves();
    await pgPool.query(
      "insert into app_meta (key, value) values ('session_secret', $1) on conflict (key) do nothing",
      [randomBytes(32).toString("hex")],
    );
    const secretRow = await pgPool.query<{ value: string }>(
      "select value from app_meta where key='session_secret'",
    );
    sessionSecretValue = String(secretRow.rows[0]?.value ?? "");
  };

  try {
    await initialize();
  } catch (firstError) {
    // A cold serverless instance can lose its first connection while Neon
    // wakes up. Every statement above is idempotent, so one retry is safe.
    console.error(
      "Database initialization failed; retrying once:",
      firstError instanceof Error ? firstError.message : String(firstError),
    );
    try {
      await initialize();
    } catch (error) {
      dbInitError = error instanceof Error ? error : new Error(String(error));
      console.error("Database initialization failed:", dbInitError.message);
    }
  }
}

export const db = useSqlite ? sqliteDb : (pool as unknown as { query: typeof sqliteQuery; exec: typeof sqliteDb.exec; all: typeof sqliteDb.all; get: typeof sqliteDb.get; run: typeof sqliteDb.run; transaction: typeof sqliteTransaction });
export const sessionSecret = sessionSecretValue;
export const usingSqlite = useSqlite;

/** Read helper for feature modules that build their own SQL. */
export function queryRows<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return q<T>(text, params);
}
export const publicFields =
  "id, category, leaf_message, chamber_id, chamber_reason, created_at, mode, is_demo";

/** Public leaves linked to a published community post expose its slug. */
const leafPostSlug = `(select p.slug
  from community_tree_leaves ctl
  join community_posts p on p.id=ctl.post_id
  where ctl.leaf_id=approved_leaves.id and p.status='published'
  limit 1) as post_slug`;

function requireDb(): { query: typeof sqliteQuery } {
  if (useSqlite) return sqliteDb;
  if (dbInitError) throw dbInitError;
  if (!pool) throw new Error("Database is not initialized.");
  return pool as unknown as { query: typeof sqliteQuery };
}

function rowToLeaf(row: Record<string, unknown>): Leaf {
  return {
    ...row,
    is_demo: Boolean(row.is_demo),
    post_slug: row.post_slug ? String(row.post_slug) : undefined,
  } as Leaf;
}

/**
 * Keeps the Living Tree in step with a community post.
 *
 * `approved_leaves` stays the single tree source of truth. A published post
 * owns exactly one leaf through `community_tree_leaves`; edits rewrite the
 * leaf message and category, while hiding or removing the post hides the
 * leaf. Restoring is explicit so a leaf hidden independently by staff is not
 * silently made public again by an ordinary edit.
 */
export type CommunityLeafInput = {
  id: string;
  title: string;
  body: string;
  categorySlug: string;
  status: string;
  createdAt: string;
};

export async function syncCommunityPostLeaf(
  runner: Queryable,
  post: CommunityLeafInput,
  options: { restore?: boolean } = {},
) {
  const theme = leafThemeForCategory(post.categorySlug);
  const message = communityLeafMessage(post.title, post.body);
  const chamberId = themeFor(theme).path;
  const links = await rowsFor<{ leaf_id: string }>(
    runner,
    "select leaf_id from community_tree_leaves where post_id=$1",
    [post.id],
  );
  const leafId = links[0]?.leaf_id;

  if (post.status !== "published") {
    if (leafId) {
      const result = await runner.query(
        "update approved_leaves set status='hidden' where id=$1 and status<>'hidden'",
        [leafId],
      );
      if (result.rowCount) await bumpRevision(runner);
    }
    return;
  }

  if (leafId) {
    await runner.query(
      `update approved_leaves
       set leaf_message=$1, category=$2, chamber_id=$3, chamber_reason=$4
       where id=$5`,
      [
        message,
        theme,
        chamberId,
        "A published community aspiration connected to the Living Tree.",
        leafId,
      ],
    );
    if (options.restore) {
      const result = await runner.query(
        "update approved_leaves set status='approved' where id=$1 and status<>'approved'",
        [leafId],
      );
      if (result.rowCount) await bumpRevision(runner);
    }
    return;
  }

  const key = `community:${post.id}`;
  await runner.query(
    `insert into approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,status,mode,is_demo,payload_hash)
     values($1,$2,$3,$4,$5,$6,$7,'approved','offline',0,'community')
     on conflict(idempotency_key) do nothing`,
    [
      randomUUID(),
      key,
      theme,
      message,
      chamberId,
      "A published community aspiration connected to the Living Tree.",
      post.createdAt,
    ],
  );
  const created = await rowsFor<{ id: string }>(
    runner,
    "select id from approved_leaves where idempotency_key=$1",
    [key],
  );
  if (!created[0]) return;
  await runner.query(
    `insert into community_tree_leaves(post_id,leaf_id,linked_at)
     values($1,$2,$3) on conflict(post_id) do nothing`,
    [post.id, created[0].id, new Date().toISOString()],
  );
  await bumpRevision(runner);
}

async function bumpRevision(runner: Queryable) {
  await runner.query(
    "update app_meta set value=cast(value as integer)+1 where key='revision'",
  );
  changed();
}

/**
 * Published posts created before tree linking existed still need a leaf.
 * Runs once during Postgres startup and is idempotent.
 */
async function backfillCommunityLeaves() {
  if (!pool) return;
  try {
    const pending = await pool.query<{
      id: string;
      title: string;
      body: string;
      category_slug: string;
      created_at: Date | string;
    }>(
      `select p.id, p.title, p.body, p.category_slug, p.created_at
       from community_posts p
       left join community_tree_leaves l on l.post_id=p.id
       where p.status='published' and l.post_id is null
       limit 500`,
    );
    if (!pending.rows.length) return;
    for (const row of pending.rows) {
      await syncCommunityPostLeaf(
        pool as unknown as Queryable,
        {
          id: row.id,
          title: row.title,
          body: row.body,
          categorySlug: row.category_slug,
          status: "published",
          createdAt:
            row.created_at instanceof Date
              ? row.created_at.toISOString()
              : String(row.created_at),
        },
        { restore: true },
      );
    }
  } catch (error) {
    console.error(
      "Community leaf backfill failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function q<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const { rows } = await requireDb().query(text, params);
  return rows as unknown as T[];
}

type Queryable = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number | null }>;
};

/**
 * Runs a read on a transaction client when one is supplied.
 *
 * Postgres hands every transaction its own connection, so a query that goes
 * through the pool cannot see rows the open transaction has written. SQLite
 * shares one connection and hides the bug, which is why transactional reads
 * always have to use the client.
 */
function rowsFor<T>(
  runner: Queryable,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return runner
    .query(text, params)
    .then((result) => result.rows as unknown as T[]);
}

export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  if (useSqlite) {
    return sqliteTransaction(async (client) => {
      // client.query is the sqlite query; ignore typed client param
      return operation({ query: client.query } as unknown as PoolClient);
    });
  }
  const client = await requireDb();
  // pg path
  const pgClient = await pool!.connect();
  try {
    await pgClient.query("BEGIN");
    const result = await operation(pgClient);
    await pgClient.query("COMMIT");
    return result;
  } catch (error) {
    await pgClient.query("ROLLBACK");
    throw error;
  } finally {
    pgClient.release();
  }
}

// Module-level cache for synchronously-accessed values
let revisionCache = 0;
let revisionCacheTime = 0;
const REVISION_CACHE_TTL_MS = 1000;

export async function asyncRevision(): Promise<number> {
  const now = Date.now();
  if (now - revisionCacheTime < REVISION_CACHE_TTL_MS) return revisionCache;
  const rows = await q<{ value: string }>(
    "select value from app_meta where key='revision'",
  );
  revisionCache = Number(rows[0]?.value ?? 0);
  revisionCacheTime = now;
  return revisionCache;
}

export function revision(): number {
  return revisionCache;
}

export function changed() {
  revisionCacheTime = 0;
}

export function recordMetric(key: string) {
  void q(
    "insert into metrics(key,count) values($1,1) on conflict(key) do update set count=metrics.count+1",
    [key],
  );
}

export function adminMetrics(): Promise<Record<string, number>> {
  return q<{ key: string; count: number | string }>(
    "select key, count from metrics",
  ).then((rows) =>
    Object.fromEntries(
      rows.map((row) => [row.key, Number(row.count) || 0]),
    ),
  );
}

export function recentAudit(
  limit = 8,
): Promise<{ action: string; leaf_id: string | null; created_at: string }[]> {
  return q<{ action: string; leaf_id: string | null; created_at: string }>(
    "select action, leaf_id, created_at from audit_events order by created_at desc, id desc limit $1",
    [limit],
  );
}

export function listLeaves(
  limit = 120,
  cursor?: { created_at: string; id: string },
): Promise<Leaf[]> {
  const { filter, params: cursorParams } = leafCursorFilter(cursor);
  const params = [...cursorParams, limit];
  return q<Leaf>(
    `select ${publicFields}, ${leafPostSlug} from approved_leaves where status='approved'${filter} order by created_at desc, id desc limit $${params.length}`,
    params,
  ).then((rows) => rows.map(rowToLeaf));
}

export function getLeaf(id: string): Promise<Leaf | undefined> {
  return q<Leaf>(
    `select ${publicFields}, ${leafPostSlug} from approved_leaves where id=$1 and status='approved'`,
    [id],
  ).then((rows) => (rows[0] ? rowToLeaf(rows[0]) : undefined));
}

export function getByKey(key: string, runner?: PoolClient) {
  const text = `select ${publicFields}, payload_hash, status from approved_leaves where idempotency_key=$1`;
  const rows = runner
    ? rowsFor<{
        id: string;
        category: string;
        leaf_message: string;
        chamber_id: number;
        chamber_reason: string;
        created_at: string;
        mode: string;
        is_demo: number;
        payload_hash: string;
        status: string;
      }>(runner as unknown as Queryable, text, [key])
    : q<{
        id: string;
        category: string;
        leaf_message: string;
        chamber_id: number;
        chamber_reason: string;
        created_at: string;
        mode: string;
        is_demo: number;
        payload_hash: string;
        status: string;
      }>(text, [key]);
  return rows.then((found) => {
    const row = found[0];
    if (!row) return undefined;
    const { payload_hash, status, ...leaf } = row;
    return {
      leaf: rowToLeaf(leaf as Record<string, unknown>),
      hash: String(payload_hash),
      status: String(status),
    };
  });
}

export function insertLeaf(
  key: string,
  hash: string,
  leaf: Leaf,
  original?: {
    idempotencyKey: string;
    aspiration: string;
    theme: string;
    reply?: string;
    owner_key?: string;
    visitor_type?: "first" | "returning";
  },
) {
  return transaction(async (client) => {
    const result = await client.query(
      `insert into approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,mode,is_demo,payload_hash)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict(idempotency_key) do nothing`,
      [
        leaf.id,
        key,
        leaf.category,
        leaf.leaf_message,
        leaf.chamber_id,
        leaf.chamber_reason,
        leaf.created_at,
        leaf.mode,
        Number(leaf.is_demo),
        hash,
      ],
    );
    if (result.rowCount && result.rowCount > 0) {
      if (original)
        recordSubmission(original, "approved", leaf.id, "", original.reply, client);
      await client.query(
        "update app_meta set value=cast(value as integer)+1 where key='revision'",
      );
      changed();
      recordMetric("accepted");
    }
    return getByKey(key, client);
  });
}

export function emptyTreeStats(): TreeStats {
  return {
    total: 0,
    today: 0,
    demo: 0,
    categories: Object.fromEntries(
      themes.map((t) => [t.id, 0]),
    ) as Record<Theme, number>,
  };
}

export function treeStats(): Promise<TreeStats> {
  return q<{ category: string; count: string }>(
    "select category, count(*) as count from approved_leaves where status='approved' group by category",
  ).then((rows) => {
    const counts = Object.fromEntries(
      rows.map((row) => [row.category, Number(row.count)]),
    );
    const categories = Object.fromEntries(
      themes.map((theme) => [theme.id, Number(counts[theme.id] || 0)]),
    ) as Record<Theme, number>;
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Thimphu",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    // `today` is a Thimphu calendar day. Compare in the same zone instead of
    // relying on the database session timezone, which is UTC on Neon.
    const todayFilter = useSqlite
      ? "date(created_at, '+6 hours') = date($1)"
      : "(created_at at time zone 'Asia/Thimphu')::date = $1::date";
    return q<{ total: string; demo: string; today: string }>(
      `select count(*) as total,
             coalesce(sum(is_demo),0) as demo,
             coalesce(sum(case when ${todayFilter} then 1 else 0 end),0) as today
      from approved_leaves where status='approved'`,
      [today],
    ).then((r) => ({
      total: Number(r[0]?.total ?? 0),
      demo: Number(r[0]?.demo ?? 0),
      today: Number(r[0]?.today ?? 0),
      categories,
    }));
  });
}

export function currentReflection(): Promise<Reflection | null> {
  return q<Reflection>(
    "select body, mode, created_at from reflection_cache where id=1",
  ).then((rows) => (rows[0] ? rows[0] : null));
}

export function saveReflection(reflection: Reflection, sourceRevision: number) {
  return transaction(async (client) => {
    const rev = await asyncRevision();
    if (rev !== sourceRevision) return false;
    await client.query(
      "insert into reflection_cache(id,body,mode,created_at,source_revision) values(1,$1,$2,$3,$4) on conflict(id) do update set body=excluded.body, mode=excluded.mode, created_at=excluded.created_at, source_revision=excluded.source_revision",
      [reflection.body, reflection.mode, reflection.created_at, sourceRevision],
    );
    await client.query(
      "update app_meta set value=cast(value as integer)+1 where key='revision'",
    );
    changed();
    return true;
  });
}

export async function snapshot(): Promise<TreeSnapshot> {
  let stats: TreeStats;
  let statsUnavailable: boolean | undefined;
  try {
    stats = await treeStats();
  } catch {
    // A database failure is not a zero. Flag it so surfaces can rest the
    // counter instead of presenting invented all-zero counts as real.
    stats = emptyTreeStats();
    statsUnavailable = true;
  }
  let leaves: Leaf[] = [];
  try {
    leaves = await listLeaves();
  } catch {
    leaves = [];
  }
  let reflection: Reflection | null = null;
  try {
    reflection = await currentReflection();
  } catch {
    reflection = null;
  }
  let revision = 0;
  try {
    revision = await asyncRevision();
  } catch {
    revision = 0;
  }
  let settings: TreeSettings = defaultTreeSettings;
  try {
    settings = await getTreeSettings();
  } catch {
    settings = defaultTreeSettings;
  }
  return {
    leaves,
    total: stats.total,
    stats,
    reflection,
    revision,
    serverTime: new Date().toISOString(),
    settings,
    ...(statsUnavailable ? { statsUnavailable: true } : {}),
  };
}

export function getTreeSettings(): Promise<TreeSettings> {
  return q<{ value: string }>(
    "select value from app_meta where key='tree_settings'",
  ).then((rows) => {
    if (!rows[0]) return defaultTreeSettings;
    try {
      return treeSettingsSchema.parse(JSON.parse(String(rows[0].value)));
    } catch {
      return defaultTreeSettings;
    }
  });
}

export function saveTreeSettings(settings: TreeSettings) {
  return transaction(async (client) => {
    await client.query(
      "insert into app_meta(key,value) values('tree_settings',$1) on conflict(key) do update set value=excluded.value",
      [JSON.stringify(settings)],
    );
    await client.query(
      "update app_meta set value=cast(value as integer)+1 where key='revision'",
    );
    changed();
    await client.query(
      "insert into audit_events(action,created_at) values('tree_settings',$1)",
      [new Date().toISOString()],
    );
  });
}

const legacyPrivateKey = createHash("sha256")
  .update(`visitor-messages:${sessionSecretValue}`)
  .digest();
const privateKey = process.env.MESSAGE_ENCRYPTION_KEY
  ? createHash("sha256").update(process.env.MESSAGE_ENCRYPTION_KEY).digest()
  : legacyPrivateKey;

function redactPrivate(text: string) {
  return text
    .replace(/[\w.+-]+\s*@\s*[\w.-]+\.[a-z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\s().-]*){7,}/g, "[number removed]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link removed]");
}

function encryptMessage(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", privateKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(redactPrivate(text), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}

export function decryptMessage(value: string) {
  for (const key of [privateKey, legacyPrivateKey])
    try {
      const [iv, tag, body] = value
        .split(".")
        .map((part) => Buffer.from(part, "base64url"));
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(body), decipher.final()]).toString(
        "utf8",
      );
    } catch {
      /* Support messages created before the separate key was configured. */
    }
  return "[Message unavailable]";
}

export function rejectedSubmission(key: string) {
  return q<{ reason: string }>(
    "select reason from visitor_submissions where idempotency_key=$1 and outcome='rejected'",
    [key],
  ).then((rows) => (rows[0] ? String(rows[0].reason) : null));
}

export function recordSubmission(
  input: {
    idempotencyKey: string;
    aspiration: string;
    theme: string;
    owner_key?: string;
    visitor_type?: "first" | "returning";
  },
  outcome: "approved" | "rejected",
  leafId?: string,
  reason = "",
  reply = "",
  runner?: PoolClient,
) {
  const text = `insert into visitor_submissions(id,idempotency_key,leaf_id,private_message,selected_theme,outcome,reason,created_at,private_reply,owner_key,visit_kind)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict(idempotency_key) do nothing`;
  const params = [
    randomUUID(),
    input.idempotencyKey,
    leafId || null,
    encryptMessage(input.aspiration),
    input.theme,
    outcome,
    reason,
    new Date().toISOString(),
    reply ? encryptMessage(reply) : "",
    input.owner_key || "",
    input.visitor_type || "first",
  ];
  return runner
    ? rowsFor(runner as unknown as Queryable, text, params)
    : q(text, params);
}

export function replyByKey(key: string) {
  return q<{ private_reply: string }>(
    "select private_reply from visitor_submissions where idempotency_key=$1 and outcome='approved'",
    [key],
  ).then((rows) => {
    if (!rows[0]?.private_reply) return null;
    const reply = decryptMessage(String(rows[0].private_reply));
    return reply === "[Message unavailable]" ? null : reply;
  });
}

export type PrivateSubmission = {
  id: string;
  leaf_id: string | null;
  message: string;
  selected_theme: Theme;
  visit_kind: "first" | "returning" | "";
  outcome: "approved" | "rejected";
  reason: string;
  created_at: string;
  leaf_message: string | null;
  leaf_status: string | null;
};

export function listSubmissions({
  page = 1,
  query: queryText = "",
  outcome = "all",
}: { page?: number; query?: string; outcome?: string } = {}) {
  return q<Record<string, unknown>>(
    `select s.id, s.leaf_id, s.private_message, s.selected_theme,
            case when s.owner_key='' then '' else s.visit_kind end as visit_kind,
            s.outcome, s.reason, s.created_at,
            l.leaf_message, l.status as leaf_status
     from visitor_submissions s
     left join approved_leaves l on l.id = s.leaf_id
     order by s.created_at desc, s.id desc`,
  ).then((rows) => {
    const all = rows
      .map((row) => ({
        ...row,
        message: decryptMessage(String(row.private_message)),
      } as Record<string, unknown> & { message: string }))
      .filter((row) => {
        const outcomeMatches = outcome === "all" || row.outcome === outcome;
        const searchable = `${row.message} ${row.leaf_message || ""} ${row.selected_theme}`.toLowerCase();
        return outcomeMatches && searchable.includes(queryText.toLowerCase());
      })
      .map((row) => {
        const { private_message: _, ...safe } = row;
        return safe as PrivateSubmission;
      });
    return {
      submissions: all.slice((page - 1) * 25, page * 25),
      total: all.length,
      page,
      pages: Math.max(1, Math.ceil(all.length / 25)),
    };
  });
}

export function deleteSubmission(id: string) {
  return transaction(async (client) => {
    const row = await client.query(
      "select leaf_id from visitor_submissions where id=$1",
      [id],
    );
    if (!row.rows[0]) return false;
    if (row.rows[0].leaf_id) {
      await client.query(
        "update approved_leaves set status='hidden' where id=$1",
        [row.rows[0].leaf_id],
      );
    }
    await client.query("delete from visitor_submissions where id=$1", [id]);
    await client.query(
      "update app_meta set value=cast(value as integer)+1 where key='revision'",
    );
    changed();
    await client.query(
      "insert into audit_events(action,leaf_id,created_at) values($1,$2,$3)",
      ["delete_message", row.rows[0].leaf_id || null, new Date().toISOString()],
    );
    return true;
  });
}

export function consumeRate(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  return transaction(async (client) => {
    await client.query("delete from rate_limits where expires <= $1", [now]);
    await client.query(
      `insert into rate_limits(key,count,expires) values($1,1,$2)
       on conflict(key) do update set count=rate_limits.count+1`,
      [key, now + windowMs],
    );
    const row = await client.query(
      "select count, expires from rate_limits where key=$1",
      [key],
    );
    const r = row.rows[0];
    return {
      allowed: Number(r.count) <= maximum,
      retryAfter: Math.max(1, Math.ceil((Number(r.expires) - now) / 1000)),
    };
  });
}

export function adminLeaves() {
  return q<{
    id: string;
    category: string;
    leaf_message: string;
    chamber_id: number;
    chamber_reason: string;
    created_at: string;
    mode: string;
    is_demo: number;
    status: string;
  }>(
    `select ${publicFields}, status from approved_leaves order by created_at desc, id desc limit 500`,
  ).then((rows) =>
    rows.map((row) => ({ ...rowToLeaf(row), status: String(row.status) })),
  );
}

export function setLeafStatus(id: string, status: "approved" | "hidden") {
  return transaction(async (client) => {
    const result = await client.query(
      "update approved_leaves set status=$1 where id=$2 and status<>$2",
      [status, id],
    );
    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        "update app_meta set value=cast(value as integer)+1 where key='revision'",
      );
      changed();
      await client.query(
        "insert into audit_events(action,leaf_id,created_at) values($1,$2,$3)",
        [status === "hidden" ? "hide" : "restore", id, new Date().toISOString()],
      );
    }
    return Boolean(result.rowCount && result.rowCount > 0);
  });
}

export function seedDemo() {
  return transaction(async (client) => {
    const countRow = await client.query(
      "select count(*) as count from approved_leaves where is_demo=1",
    );
    if (Number((countRow.rows[0] as { count: string }).count) > 0) return 0;
    for (let round = 0; round < 4; round++) {
      for (const theme of themes) {
        const id = randomUUID();
        await client.query(
          `insert into approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,mode,is_demo,payload_hash)
           values($1,$2,$3,$4,$5,$6,$7,$8,1,'demo')`,
          [
            id,
            id,
            theme.id,
            theme.message,
            theme.path,
            "An illustrative contribution for the BI Tree demonstration.",
            new Date(
              Date.now() - (24 - round * 6 - themes.indexOf(theme)) * 60000,
            ).toISOString(),
            "offline",
          ],
        );
      }
    }
    changed();
    await client.query("delete from reflection_cache where id=1");
    await client.query(
      "update app_meta set value=cast(value as integer)+1 where key='revision'",
    );
    await client.query(
      "insert into audit_events(action,created_at) values('seed_demo',$1)",
      [new Date().toISOString()],
    );
    return 24;
  });
}

export function clearDemo() {
  return transaction(async (client) => {
    const result = await client.query(
      "delete from approved_leaves where is_demo=1",
    );
    changed();
    await client.query("delete from reflection_cache where id=1");
    await client.query(
      "update app_meta set value=cast(value as integer)+1 where key='revision'",
    );
    await client.query(
      "insert into audit_events(action,created_at) values('clear_demo',$1)",
      [new Date().toISOString()],
    );
    return Number(result.rowCount);
  });
}

export { sqliteCloseDb as closeDb };
