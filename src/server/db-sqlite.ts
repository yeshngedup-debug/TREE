import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import {
  communityCategorySeeds,
  communityLeafMessage,
  leafThemeForCategory,
} from "@/lib/community";
import { themeFor } from "@/lib/catalog";

const path = process.env.DATABASE_PATH ?? "data/living-tree.sqlite";
let sqliteDatabase: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!sqliteDatabase) {
    sqliteDatabase = new DatabaseSync(path);
    initSchema(sqliteDatabase);
  }
  return sqliteDatabase;
}

function initSchema(database: DatabaseSync) {
  database.exec(`
    create table if not exists approved_leaves (
      id text primary key,
      idempotency_key text not null unique,
      category text not null,
      leaf_message text not null,
      chamber_id integer not null,
      chamber_reason text not null,
      created_at text not null default (datetime('now')),
      status text not null default 'approved',
      mode text not null default 'offline',
      is_demo integer not null default 0,
      payload_hash text not null default ''
    );
    create index if not exists leaves_public_order on approved_leaves(status, created_at desc, id desc);
    create table if not exists app_meta (
      key text primary key,
      value text not null
    );
    create table if not exists rate_limits (
      key text primary key,
      count integer not null,
      expires bigint not null
    );
    create table if not exists audit_events (
      id integer primary key autoincrement,
      action text not null,
      leaf_id text,
      created_at text not null default (datetime('now'))
    );
    create table if not exists reflection_cache (
      id integer primary key check (id = 1),
      body text not null,
      mode text not null,
      created_at text not null default (datetime('now')),
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
      outcome text not null,
      reason text not null default '',
      created_at text not null default (datetime('now')),
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
      created_at text not null default (datetime('now'))
    );
    create table if not exists visitor_profile_leaves (
      leaf_id text primary key,
      profile_id text not null,
      linked_at text not null default (datetime('now'))
    );
    create index if not exists visitor_profile_leaves_profile on visitor_profile_leaves(profile_id, linked_at desc);
    create table if not exists visitor_profile_sessions (
      token_hash text primary key,
      profile_id text not null,
      expires bigint not null
    );
    create table if not exists community_accounts (
      id text primary key,
      username text not null unique,
      display_name text not null,
      bio text not null default '',
      avatar_url text not null default '',
      password_hash text not null,
      password_salt text not null,
      role text not null default 'member',
      status text not null default 'active',
      created_at text not null,
      updated_at text not null
    );
    create table if not exists community_sessions (
      token_hash text primary key,
      account_id text not null,
      created_at text not null,
      expires bigint not null
    );
    create index if not exists community_sessions_account on community_sessions(account_id);
    create table if not exists community_categories (
      slug text primary key,
      label text not null,
      description text not null default '',
      sort_order integer not null default 0,
      created_at text not null
    );
    create table if not exists community_posts (
      id text primary key,
      slug text not null unique,
      author_id text not null,
      title text not null,
      body text not null,
      content_type text not null,
      category_slug text not null,
      image_url text not null default '',
      status text not null default 'published',
      search_text text not null default '',
      like_count integer not null default 0,
      comment_count integer not null default 0,
      featured integer not null default 0,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists community_posts_feed on community_posts(status, created_at desc, id desc);
    create index if not exists community_posts_category on community_posts(category_slug, status, created_at desc);
    create index if not exists community_posts_author on community_posts(author_id, status, created_at desc);
    create index if not exists community_posts_featured on community_posts(featured, status, created_at desc);
    create index if not exists community_posts_type_feed on community_posts(content_type, status, created_at desc, id desc);
    create table if not exists community_tags (
      slug text primary key,
      label text not null,
      created_at text not null
    );
    create table if not exists community_post_tags (
      post_id text not null,
      tag_slug text not null,
      primary key (post_id, tag_slug)
    );
    create index if not exists community_post_tags_tag on community_post_tags(tag_slug, post_id);
    create table if not exists community_likes (
      post_id text not null,
      account_id text not null,
      created_at text not null,
      primary key (post_id, account_id)
    );
    create index if not exists community_likes_account on community_likes(account_id, created_at desc);
    create table if not exists community_bookmarks (
      post_id text not null,
      account_id text not null,
      created_at text not null,
      primary key (post_id, account_id)
    );
    create index if not exists community_bookmarks_account on community_bookmarks(account_id, created_at desc);
    create table if not exists community_comments (
      id text primary key,
      post_id text not null,
      author_id text not null,
      body text not null,
      status text not null default 'published',
      created_at text not null
    );
    create index if not exists community_comments_post on community_comments(post_id, status, created_at asc);
    create index if not exists community_comments_author on community_comments(author_id, created_at desc);
    create table if not exists community_reports (
      id text primary key,
      post_id text,
      comment_id text,
      reporter_id text not null,
      reason text not null,
      detail text not null default '',
      status text not null default 'open',
      created_at text not null,
      resolved_at text,
      check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
    );
    create index if not exists community_reports_status on community_reports(status, created_at asc);
    create unique index if not exists community_reports_post_unique on community_reports(post_id, reporter_id) where post_id is not null;
    create unique index if not exists community_reports_comment_unique on community_reports(comment_id, reporter_id) where comment_id is not null;
    create table if not exists community_moderation (
      id text primary key,
      actor_kind text not null,
      actor_id text not null default '',
      action text not null,
      target_kind text not null,
      target_id text not null,
      note text not null default '',
      created_at text not null
    );
    create index if not exists community_moderation_target on community_moderation(target_kind, target_id, created_at desc);
    create table if not exists community_tree_leaves (
      post_id text primary key,
      leaf_id text not null unique,
      linked_at text not null
    );
    create index if not exists community_tree_leaves_leaf on community_tree_leaves(leaf_id);
  `);
  // Older databases were created before community posts carried a featured
  // flag. The additive column keeps their schema current.
  try {
    database.exec(
      `alter table community_posts add column featured integer not null default 0`,
    );
  } catch {
    /* The column already exists. */
  }
  database.exec(
    `insert into app_meta (key, value) values ('revision', '0') on conflict(key) do nothing`,
  );
  const seed = database.prepare(
    `insert into community_categories(slug,label,description,sort_order,created_at)
     values(?,?,?,?,?) on conflict(slug) do nothing`,
  );
  for (const category of communityCategorySeeds) {
    seed.run(
      category.slug,
      category.label,
      category.description,
      category.sortOrder,
      new Date().toISOString(),
    );
  }
  const secret = randomBytes(32).toString("hex");
  const db: any = database;
  db.prepare(
    `insert into app_meta (key, value) values ('session_secret', ?) on conflict(key) do nothing`,
  ).run(secret);
  backfillCommunityLeaves(database);
}

/**
 * Published posts created before tree linking existed still need a leaf.
 * Linking is idempotent: a post that already has a link is skipped.
 */
function backfillCommunityLeaves(database: DatabaseSync) {
  const rows = database
    .prepare(
      `select p.id, p.slug, p.title, p.body, p.category_slug, p.created_at
       from community_posts p
       left join community_tree_leaves l on l.post_id=p.id
       where p.status='published' and l.post_id is null
       limit 500`,
    )
    .all() as {
    id: string;
    slug: string;
    title: string;
    body: string;
    category_slug: string;
    created_at: string;
  }[];
  if (!rows.length) return;
  const insertLeaf = database.prepare(
    `insert into approved_leaves(id,idempotency_key,category,leaf_message,chamber_id,chamber_reason,created_at,status,mode,is_demo,payload_hash)
     values(?,?,?,?,?,?,?,'approved','offline',0,'community')`,
  );
  const insertLink = database.prepare(
    `insert into community_tree_leaves(post_id,leaf_id,linked_at) values(?,?,?)`,
  );
  for (const row of rows) {
    const theme = leafThemeForCategory(row.category_slug);
    const key = `community:${row.id}`;
    insertLeaf.run(
      randomUUID(),
      key,
      theme,
      communityLeafMessage(row.title, row.body),
      themeFor(theme).path,
      "A published community aspiration connected to the Living Tree.",
      row.created_at,
    );
    const leaf = database
      .prepare(`select id from approved_leaves where idempotency_key=?`)
      .get(key) as { id: string } | undefined;
    if (leaf) insertLink.run(row.id, leaf.id, new Date().toISOString());
  }
  database.exec(
    `update app_meta set value=cast(value as integer)+1 where key='revision'`,
  );
}

const WRITE_RE = /^\s*(insert|update|delete|create|alter|drop|replace)\b/i;

function toSqliteParams(
  sql: string,
  params: unknown[],
): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  let max = 0;
  const converted = sql.replace(/\$(\d+)/g, (_m, n) => {
    const index = Number(n);
    max = Math.max(max, index);
    values.push(params[index - 1]);
    return "?";
  });
  if (max > params.length) {
    throw new Error(
      `SQLite placeholder mismatch: SQL references $${max} but only ${params.length} params were provided`,
    );
  }
  return { sql: converted, values };
}

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount?: number;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult> {
  const database = getDb();
  const { sql, values } = toSqliteParams(text, params);
  const db: any = database;
  if (WRITE_RE.test(text)) {
    const result = db.prepare(sql).run(...values);
    return { rows: [], rowCount: result.changes ?? 0 };
  }
  const rows = db.prepare(sql).all(...values);
  return { rows, rowCount: rows.length };
}

async function run(
  sql: string,
  params: unknown[] = [],
): Promise<{ rowCount: number; lastInsertRowid?: number }> {
  const database = getDb();
  const { sql: converted, values } = toSqliteParams(sql, params);
  const db: any = database;
  const result = db.prepare(converted).run(...values);
  return { rowCount: result.changes ?? 0, lastInsertRowid: result.lastInsertRowid as number | undefined };
}

export async function transaction<T>(operation: (client: { query: typeof query; run: typeof run }) => Promise<T>): Promise<T> {
  const database = getDb();
  database.exec("BEGIN");
  try {
    const result = await operation({ query, run });
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

let sessionSecretValue: string | null = null;
function loadSessionSecret(): string {
  const database = getDb();
  const db: any = database;
  const row = db.prepare("select value from app_meta where key='session_secret'").get() as { value: string } | undefined;
  return row ? row.value : "";
}

export function getSessionSecret(): string {
  if (sessionSecretValue === null) {
    sessionSecretValue = loadSessionSecret();
  }
  return sessionSecretValue;
}

export const db = {
  query,
  run,
  exec: (sql: string) => {
    const db: any = getDb();
    return db.exec(sql);
  },
  all: <T = unknown>(sql: string, params?: unknown[]) => {
    const db: any = getDb();
    return db.prepare(sql).all(...(params as unknown[]));
  },
  get: <T = unknown>(sql: string, params?: unknown[]) => {
    const db: any = getDb();
    return db.prepare(sql).get(...(params as unknown[])) as T | undefined;
  },
  transaction,
};

export function closeDb() {
  if (sqliteDatabase) {
    sqliteDatabase.close();
    sqliteDatabase = null;
  }
}
