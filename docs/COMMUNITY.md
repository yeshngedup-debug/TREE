# Community platform

BI Tree pairs the anonymous QR leaf flow with a durable community layer: people
create an account, publish a titled **aspiration** or **idea**, discuss it, and
the same content grows a leaf on the Living Tree. This document describes how
that layer is built, which invariants it protects, and where to extend it.

The anonymous `/join` → `/leaf/[id]` flow is unchanged and remains the
lowest-friction path. Community posts are additive: they reuse the same
`approved_leaves` table as the single source of truth for the 3D tree.

## Stack and layout

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind 4 plus the project's utility classes |
| Validation | Zod 4 schemas in `src/lib/community.ts` |
| Database | PostgreSQL (`pg`, Neon-compatible); SQLite adapter for the test harness |
| ORM | None. Parameterised SQL in `src/server/community.ts` |
| Sessions | Opaque random tokens, SHA-256 hashed at rest |
| Passwords | `scrypt` with a per-account salt and NFKC normalisation |

Community pages live under `src/app` (`discover`, `create`, `posts`, `u`,
`saved`, `admin/community`). UI components live in `src/features/community`.
The domain service is `src/server/community.ts`; schemas and shared types are
`src/lib/community.ts`.

## Data model

All community tables are created idempotently by `initDatabase()` in
`src/server/db/index.ts`. `src/server/db-sqlite.ts` mirrors the same shape for
the isolated Playwright harness.

| Table | Purpose and key constraints |
| --- | --- |
| `community_accounts` | Username (unique), display name, bio, avatar URL, scrypt hash/salt, `role` (`member`/`moderator`/`admin`), `status` (`active`/`suspended`) |
| `community_sessions` | `token_hash` primary key, account FK, creation time, expiry in ms; cascades on account delete |
| `community_categories` | Slug primary key, label, description, `sort_order`; seeded on first boot |
| `community_posts` | Slug unique, author FK, title, body, `content_type` (`aspiration`/`idea`), category FK, image URL, status (`published`/`hidden`/`removed`), denormalised `search_text`, counters, `featured` |
| `community_tags` / `community_post_tags` | Normalised tag vocabulary and many-to-many join (primary key `post_id, tag_slug`) |
| `community_likes` / `community_bookmarks` | One row per account and post (composite primary key), cascading FKs |
| `community_comments` | Post FK, author FK, body, status (`published`/`hidden`/`removed`) |
| `community_reports` | Exactly one of post or comment (check constraint), reason enum, status, unique per reporter and target |
| `community_moderation` | Append-only audit log: actor kind/id, action, target kind/id, note, timestamp |
| `community_tree_leaves` | One leaf per post (`post_id` primary key, `leaf_id` unique) |

### Indexes

Feeds and filters are covered by:

- `community_posts(status, created_at desc, id desc)`
- `community_posts(content_type, status, created_at desc, id desc)`
- `community_posts(category_slug, status, created_at desc)`
- `community_posts(author_id, status, created_at desc)`
- `community_posts(featured, status, created_at desc)`
- `community_posts_search` — GIN on `to_tsvector('simple', search_text)`
- join-table, session, comment, report, moderation and leaf indexes

Post counts on `like_count` and `comment_count` are maintained transactionally
with the like/comment rows so feed queries never aggregate at read time.

### Schema evolution

There is no separate migration framework. `initDatabase()` runs
`create table if not exists`, additive `alter table ... add column if not
exists`, and `create index if not exists` on every boot. That is safe for the
current additive history and keeps first-run deployment simple.

When a future change needs a destructive rewrite (renaming a column, changing a
type, backfilling in batches), add a real migration runner instead of extending
the bootstrap string. The bootstrap is not a substitute for versioned
migrations.

## Accounts and sessions

- Sign-up validates username (`3–24`, lowercase letters, digits, underscore),
  display name, password (8–200), bio and optional HTTPS avatar URL. Control
  characters and bidi overrides are rejected.
- Sign-in normalises the username, compares scrypt output in constant time and
  rejects suspended accounts.
- `startSession()` creates a 32-byte base64url token, stores only its SHA-256
  hash, and sets the `bi_community` cookie for 30 days with `HttpOnly`,
  `SameSite=Lax`, and `Secure` when the request is HTTPS.
- `endSession()` deletes the stored hash. Suspending an account deletes all of
  its sessions.
- `GET /api/community/auth/me` is the client bootstrap used by the header
  account menu. It returns `{ authenticated, account }` with no-store headers.
- Password reset and in-app password change are intentionally not implemented
  yet; see **Known limitations**.

## Publishing

`postCreateSchema` enforces:

- title 6–120 characters, body 20–5000, at most 6 tags (slugified, deduped);
- `contentType` in `aspiration` / `idea`;
- an existing category slug;
- an empty or `https://` image URL.

The service verifies the category, derives a unique slug with a small retry
loop, writes the post, tags and tree leaf in one transaction, and recomputes a
lower-cased `search_text` from title, body, category, tags, author and content
type. Editing replaces all fields, re-derives tags and re-syncs the leaf. The
author is always taken from the session, never from the request body.

## Engagement

- Likes and bookmarks are toggles with composite primary keys, so retries
  cannot double-count.
- Comments are created transactionally with `comment_count`; author deletion
  soft-hides the comment and decrements the count.
- Reports accept one submission per reporter per target. Reports create an
  audit entry and appear in the moderation queue.
- Saved posts are private to the account and excluded from search engines.

## Moderation and authorization

There are two authorities:

1. **Staff session** — `ADMIN_PASSWORD` login from `/admin`, used for the
   original event tools and for the community console.
2. **Community account** — `moderator` or `admin` role.

| Action | Moderator | Community admin | Staff |
| --- | --- | --- | --- |
| Hide/restore/remove posts | yes | yes | yes |
| Restore/remove comments | yes | yes | yes |
| Resolve/dismiss reports | yes | yes | yes |
| Feature/unfeature posts | yes | yes | yes |
| Change account roles | no | yes | yes |
| Suspend/restore accounts | no | yes | yes |
| Create/edit categories | no | yes | yes |

`canManageCommunity()` and the `managementActions` gate in
`applyModerationAction()` enforce this server-side. The console mirrors the same
rule in the UI, but the server check is authoritative. Moderators cannot change
their own role or status, and staff authority always wins when both sessions
are present.

Every applied action is appended to `community_moderation`; the console shows
the recent trail. Hiding or removing a post also hides its Living Tree leaf, and
restoring a post is explicit so an independently hidden leaf is not silently
republished.

## Search and discovery

`/discover` and `GET /api/community/posts` share `listPosts()`:

- filters: free text `q`, content `type`, `category`, `tag`;
- sort: `newest` or `popular` (likes, comments, date);
- pagination: `page` (max 500) and `pageSize` (default 12, max 48).

PostgreSQL uses `to_tsvector('simple', search_text) @@
plainto_tsquery('simple', $n)` against the GIN index. The SQLite harness uses
`instr()` so tests exercise the same service without a second code path in the
application. Queries are parameterised; limits are validated by Zod.

Popular tags come from a join restricted to published posts.

## Living Tree integration

`syncCommunityPostLeaf()` in `src/server/db/index.ts` keeps one `approved_leaves`
row per community post:

- publish: create or update the leaf message (`title` + excerpt), theme
  category, chamber and reason;
- edit: update the existing leaf, preserving its id and history;
- hide/remove: set the leaf status to `hidden`;
- restore: set the leaf back to `approved` only when moderation explicitly
  publishes the post.

`GET /api/leaves` and `getLeaf()` expose `post_slug` only while the post is
published, so the display kiosk and the keepsake page link back to the full
post without leaking hidden or removed content.

## SEO and indexing

- `sitemap.ts` lists public static routes, up to 5,000 published posts and up to
  2,000 profiles that have at least one published post.
- `/create`, `/join`, `/voices`, `/saved`, `/admin`, `/admin/community` and
  `/posts/[slug]/edit` set `robots: { index: false }`; the sitemap excludes them
  and `robots.ts` disallows them.
- Post pages emit canonical metadata, Open Graph/Twitter metadata and
  `BlogPosting` structured data with the author as a `Person`. Profile pages
  emit `Person` data.
- Drafts do not exist publicly: a post is `published` on creation, and hidden
  or removed posts return 404 from public routes.

## Security checklist

- Server-side authorization on every mutation; ownership is derived from the
  session, never from client input.
- `requireSameOrigin()` on all mutating routes, JSON-only parsing and bounded
  request bodies.
- Zod validation at every boundary, including query strings.
- Parameterised SQL only; no string interpolation of user values.
- Scrypt password hashing with per-account salts; session tokens stored hashed.
- Rate limits on auth, publishing, editing, comments, likes, bookmarks and
  reports, keyed by account and by a hashed client address.
- Foreign keys and check constraints protect referential integrity.
- Error responses do not include stack traces or database details.
- Uploaded files are not accepted; avatars and post images are HTTPS URLs.

## Future monetization extension points

No payments, ads or sponsored ranking exist today. The schema leaves room for
them without changing current behaviour:

- `community_posts.featured` is an editorial flag controlled by staff and is
  not influenced by payment. A future sponsorship system should add its own
  table keyed by post or campaign and must not reuse `featured` as a paid rank.
- `community_categories.sort_order` is editorial. Paid placement should be a
  separate, clearly labelled surface.
- `community_moderation` is append-only, so sponsored changes can be audited
  alongside content decisions.
- Counters and feeds are derived from base tables, so a future promotion table
  can be joined at read time without rewriting posts.

Any monetization feature must keep disclosure explicit, keep private data out
of ad targeting, and preserve the anonymous leaf flow unchanged.

## Known limitations

- Avatar and post images are external HTTPS URLs; there is no upload pipeline,
  image resizing or content scanning.
- No password reset, password change or email verification. Account recovery
  is a staff/database operation today.
- No formal migration framework; see **Schema evolution**.
- No rich text or Markdown rendering. Bodies are rendered as plain text.
- The moderation queue is intentionally lightweight: reports are reviewed but
  there is no assignment, SLA or notification system.
- Search is lexical (`simple` configuration). There are no synonyms, stemming
  or semantic ranking.
- No sponsored-content flag, billing or analytics integration.
- SQLite exists for tests and offline tooling, not for production deployment.

## API surface

| Method | Route | Auth |
| --- | --- | --- |
| POST | `/api/community/auth/signup` | public, rate limited |
| POST | `/api/community/auth/login` | public, rate limited |
| POST | `/api/community/auth/logout` | session |
| GET | `/api/community/auth/me` | public (returns null when signed out) |
| PATCH | `/api/community/profile` | session |
| GET | `/api/community/categories` | public |
| GET | `/api/community/posts` | public |
| POST | `/api/community/posts` | session |
| GET | `/api/community/posts/[slug]` | public (published only) |
| PATCH/DELETE | `/api/community/posts/[slug]` | author |
| POST | `/api/community/posts/[slug]/like` | session |
| POST | `/api/community/posts/[slug]/bookmark` | session |
| GET/POST | `/api/community/posts/[slug]/comments` | public / session |
| DELETE | `/api/community/comments/[id]` | comment author |
| POST | `/api/community/posts/[slug]/report` | session |
| POST | `/api/community/comments/[id]/report` | session |
| GET | `/api/community/saved` | session |
| GET/POST | `/api/community/moderation` | staff, moderator or admin |

## Verification

Run the standard gates after any community change:

```powershell
npm run typecheck
npm run lint
npm run build
node scripts/test-server.mjs   # isolated harness, ports 3100/3101/3102
npx playwright test
```

The community browser/API coverage is in `tests/community.spec.ts`; it asserts
publishing, discovery, profiles, engagement, moderation authority, tree sync,
SEO output and API gates.
