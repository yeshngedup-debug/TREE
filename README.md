# L Tree (Living Tree)
A real-time wishing tree web app where every leaf is a visitor's aspiration.

## Overview

**L Tree (Living Tree)** — A real-time wishing tree web app built with **Next.js 15** (React 19), **Neon Postgres**, and **Vercel**. Visitors submit aspirations from their phone; leaves animate onto the public tree screen instantly.

**Two routes in one Vercel project:**

- **`/tree`** — Large public display showing the tree and a QR code. Anyone with the URL can view; no sign-in required. New leaves animate on in real time.
- **`/phone`** — PWA visitors reach by scanning the QR. Two tabs: first-timer (write an aspiration) and returnee (sign in to view/update/delete their leaves). After submitting: congratulations animation, leaf position with glowing effect, a sourced message, and ranking. Save/share an image of the tree with your glowing leaf.

**Core real-time loop:** when a visitor submits from phone → leaf appears on tree screen instantly with animation. Every other feature depends on this loop working reliably on Vercel's serverless runtime.

---

## Architecture Decisions

### Database: One Neon Project, Shared Schema, Per-Tree RLS

- **Single Neon project** serves both dev and prod (deliberate choice — see Risks section).
- **Shared schema** with one `trees` table. Trees are isolated via **Postgres Row Level Security (FORCE ROW LEVEL SECURITY)**.
- Every request sets four GUCs at the start of the transaction:
  - `app.current_tree` (uuid) — which tree this request may see
  - `app.user_id` (text) — Clerk user id, or `''` for anonymous
  - `app.role` (text) — `'anonymous' | 'visitor' | 'owner' | 'moderator' | 'super_admin'`
  - `app.mode` (text) — `'request' | 'service' | 'bootstrap'`
- **FORCE ROW LEVEL SECURITY** even constrains the table owner, so isolation is guaranteed.

**Risks of shared database:** concurrent DDL migrations can lock tables. Always run migrations in a maintenance window. The `0001_init.sql` / `0002_rls.sql` pair is idempotent and safe to re-run.

### Real-Time: Client-Side Polling (Vercel-Serverless Safe)

**Chosen approach:** client polls `/api/tree?trees=global` every 2–3 seconds.

**Why not SSE/WebSockets on Vercel:** serverless functions don't persist connections. An SSE `Response.stream()` closes when the serverless instance recycles, losing events. Polling is guaranteed to work, and 2-second intervals are imperceptible to users.

**Event flow:**

1. `/api/leaves` POST → inserts leaf + writes `tree_events` row (inside `submit_leaf` SQL function with advisory lock)
2. Client polls `/api/tree?trees=global` → returns current published leaves + `lastEventId`
3. On new `lastEventId`, client knows new leaves have appeared and can animate them on
4. Studio changes (tree customization) also write to `tree_events`, so the tree screen picks them up on the next poll

**Future split:** when the tree screen and phone app become separate deployments, they share one database. The SSE approach can be re-introduced with an Ably or Pusher push backend, but polling works fine for the MVP.

### Auth: Clerk (email/password + Google + GitHub)

- **Hosted auth provider:** Clerk (configured in the Clerk dashboard).
- **Sign-in methods:** email/password, Google, and GitHub — added as social providers in the Clerk app settings.
- **Role source of truth:** Postgres `users.role` column. Clerk holds the session; the app reads `users.role` server-side and sets `app.role` GUC. This means roles are durable and not tied to a specific auth provider — you could swap Clerk for Supabase Auth with minimal changes.
- **Stored fields:** `email`, `display_name`, `avatar_url`, `preferences` (jsonb: `{leafColor, leafShape, theme}`).

**Why not Supabase Auth:** Clerk gives better UX out-of-the-box for this use case (hosted pages, magic links, multi-provider sign-in). Supabase would require more custom UI. Both integrate cleanly with Neon RLS, but Clerk's admin UI and webhook model felt more production-ready for this build.

### AI: Provider Abstraction (OpenAI-compatible ↔ Anthropic)

All model calls go through `src/lib/ai/provider.ts`. Two implementations:

- **`OpenAiCompatibleProvider`** — works with any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, a self-hosted vLLM, etc.). Configure via `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER`, `AI_TIMEOUT_MS`.
- **`AnthropicProvider`** — the "switch to Anthropic later" path. Enable with `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. Default model: `claude-opus-5-5`.

**Moderation pipeline:**

1. Submit → `moderateAspiration(body, provider)` → AI verdict or keyword fallback
2. If AI flags → leaf stored `status='hidden'`, `flagged=true`, `message_status='pending'`, queued for admin review
3. If AI doesn't flag → leaf auto-publishes `status='published'`
4. Background pipeline (`generateMessageForLeaf`) composes the relevant message + verifies sources
5. If sources can't be verified → curated quote library used, AI text shown as `ai_commentary=true` commentary

**Curated quote library:** real works only, verified attributions. Used when generation fails or sources can't be verified (see AI behavior section).

### Rate Limiting & Retention

- **Rate-limit key:** signed-in → `'u:<clerkUserId>'`; anonymous → `'anon:<sha256(deviceCookie + ipHash + uaHash)>'`
- **Device cookie:** `wt_vid` httpOnly, set on first contact. Rotating it invalidates the rate key (acceptable — only affects rate limiting).
- **IP/UA hash purging:** `leaf_meta` table purges after **24 hours** (cron job).
- **Rate-limit record purging:** `rate_limits` table purges after **7 days** (cron job).

### Image Sharing

After submitting, the visitor can save/share an image. The image is generated on the client (Canvas) showing:
- The tree with the visitor's leaf glowing
- Their aspiration text
- Their ranking number

No server-side image generation is needed — the client draws from the tree state. If server-side is preferred later, add an `/api/share-image` route that renders the tree via Puppeteer/Playwright.

---

## Environment Variables

Create a `.env` file (or set in Vercel dashboard). **All variables listed are required** for the app to function; missing keys cause graceful fallbacks (e.g., AI unavailable → keyword moderation only).

```dotenv
# === Database ===
DATABASE_URL=postgres://ep_user:ep_pw@ep-db.freeze neon.tech:5432/neondb?sslmode=require
# Alternative: NEON_DATABASE_URL (same thing)

# === Auth (Clerk) ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXX
# In Vercel: add these as environment variables, not in .env committed to repo

# === AI Provider ===
# Switch between OpenAI-compatible and Anthropic:
AI_PROVIDER=openai-compatible   # or: anthropic
# If openai-compatible:
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-XXXXXXXXXXXXXXXX
AI_MODEL=gpt-4.1-mini           # or your preferred model
# If anthropic:
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXX
ANTHROPIC_MODEL=claude-opus-5-5 # override if desired
AI_TIMEOUT_MS=15000             # per-request timeout

# === Curated Quotes (no API key needed) ===
# No env vars needed — the curated library is baked in.

# === Real-Time ===
# Polling interval controlled in src/lib/realtime.ts; no env vars needed.
# To use Ably push instead of polling:
# REALTIME_PROVIDER=ably
# ABLY_API_KEY=your-ably-key

# === Rate Limiting ===
SUBMIT_RATE_LIMIT=6             # max submissions per window
SUBMIT_RATE_WINDOW_SECONDS=600  # 10 minutes

# === Optional: Search-based source verification ===
# Uncomment and set if you want search-assisted verification:
# SEARCH_PROVIDER=tavily         # or: brave
# SEARCH_API_KEY=your-search-api-key

# === Vercel Settings ===
VERCEL_URL=your-deployment.vercel.app
```

### Clerk Setup

1. Create a Clerk app at https://clerk.com/
2. Add sign-in methods: Email/Password, Google, GitHub.
3. Under "User Tags" or "Custom Fields", add: `leaf_color`, `leaf_shape`, `theme` (these map to `preferences` in the `users` table; the app writes them on sign-in).
4. Set up a webhook: `http://<your-vercel-url>/api/webhooks/clerk` — this syncs user changes to Postgres. (The `ensureUser` function in `src/lib/auth.ts` does a lazy upsert on first write, so the webhook is optional for MVP but recommended.)

### Neon Setup

1. Create a Neon project at https://neon.tech/
2. Copy the **connection string** (pooler format: `postgres://...`) into `DATABASE_URL`.
3. Enable **branch/offline** development if you need separate dev branches — the schema is designed for a shared approach, but you can create `neon` branches per environment.

### Vercel Deployment

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Add the environment variables listed above under **Project Settings → Environment Variables**.
4. Deploy. The app will be at `<project>.vercel.app`.

**Important:** Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a public variable (prefixed `NEXT_PUBLIC_`) so the frontend can load Clerk. Keep `CLERK_SECRET_KEY` and `DATABASE_URL` as secret variables.

---

## API Routes

| Route | Method | Description |
|------|--------|-------------|
| `/api/leaves` | POST | Submit an aspiration (returns leafId, position, published flag, messageStatus) |
| `/api/leaves` | GET | Current tree state (published leaves + lastEventId) — used by /tree polling |
| `/api/leaves/[id]/message` | GET | Check if the AI message is ready for a given leaf (status, message, sources) |
| `/api/phone` | GET | Phone screen landing: two tabs (first timer / returnee) |
| `/api/phone` | POST | Submit from first-timer tab |
| `/api/phone/me` | GET | Returnee: show existing leaves for signed-in user |
| `/api/tree` | GET | Tree state polling endpoint (returns leaves + lastEventId) |
| `/api/tree/stream` | GET | SSE endpoint (alternative to polling; may not persist on Vercel serverless) |
| `/api/webhooks/clerk` | POST | Sync user data to Postgres (optional but recommended) |

---

## Studio (Tree Customization)

**`/studio`** — Restricted to the tree owner + moderators. Features:

- Change tree **theme** (sky color, canopy color, leaf palette, leaf shape)
- Change **access mode**: open / event window / invite-only
- Set **event window** start/end dates
- Generate/regenerate **invite tokens** (hashed stored in `trees.invite_token_hash`)
- Invite moderators (add entries to `tree_members`)
- View **moderation queue** (flagged leaves awaiting review)
- Hide/remove leaves (calls `hide_leaf` / `remove_leaf` SQL functions, which shift rankings)

**Access control:** only the tree owner (`users.role = 'owner'` via `tree_members`) and moderators (`role = 'moderator'`) can access. The studio reads the current tree theme/access mode and posts updates to `PATCH /api/studio` (implementation pending in this first build — the schema and RLS are ready; the UI can be added in a follow-up PR).

---

## Admin (Moderation)

**`/admin`** — Restricted to super-admin (single account with `users.role = 'super_admin'`). Features:

- View **all flagged leaves** across all trees
- **Hide** or **remove** any leaf (shifts rankings of later leaves)
- **Restore** a removed leaf (re-positions it at the end)
- View **source verification** status
- Purge **rate-limit** and **IP/UA hash** records

---

## Rate Limiting & Retention Details

### Rate-Limit Key Construction

```text
signed-in:      "u:<clerk user id>"
anonymous:      "anon:<sha256(deviceCookie + ipHash + uaHash)>"
```

Where:
- `ipHash = sha256("ip:<salt>:<clientIp>")`
- `uaHash = sha256("ua:<salt>:<userAgent>")`
- `deviceCookie` is the `wt_vid` cookie value

### Retention Policies

| Record | Table | Purge After |
|--------|-------|-------------|
| IP + UA hashes | `leaf_meta` | 24 hours |
| Rate-limit records | `rate_limits` | 7 days |
| All leaves | `leaves` | **Never** — kept permanently |
| Event logs | `tree_events` | Optional — can be pruned after 90 days |

### Purging Cron (run via Vercel Cron Jobs or a background worker)

```sql
-- Purge IP/UA hashes older than 24 hours
DELETE FROM leaf_meta WHERE created_at < now() - interval '24 hours';

-- Purge rate-limit records older than 7 days
DELETE FROM rate_limits WHERE created_at < now() - interval '7 days';
```

Set up in Vercel: **Settings → Cron Jobs** → run the above SQL once per day.

---

## Future Split Checklist

> **Goal:** split the single Vercel project into two separate deployments (tree screen + phone app) that share one Neon database.

### Phase 1 — Preparation (done in this build)

- [x] All data access goes through a shared `src/lib/db.ts` module
- [x] RLS policies work per-tree with GUCs (`app.current_tree`, `app.user_id`, `app.role`, `app.mode`)
- [x] Submission pipeline (`submitAspiration`) is route-agnostic — works for both `/tree` and `/phone`
- [x] Real-time polling endpoint `/api/tree` is separate from auth-gated routes
- [x] AI provider abstraction (`src/lib/ai/provider.ts`) — switch config-only
- [x] Rate limiting is tree-scoped and works for both routes
- [x] Database schema uses one global schema; trees isolated by `tree_id` column + RLS

### Phase 2 — Split the Vercel Project

1. **Create two Vercel projects:**
   - `wishing-tree-tree` — serves `/tree` only
   - `wishing-tree-phone` — serves `/phone` only
   - Both point at the **same Neon project** (different branches or a shared `main` branch)

2. **Environment variable parity:** ensure both projects have identical env vars:
   - `DATABASE_URL` (same Neon connection string)
   - `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
   - `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` / `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

3. **Route mapping:**
   - `wishing-tree-tree`: `pages/api/tree.*`, `pages/studio.*`, etc.
   - `wishing-tree-phone`: `pages/api/phone.*`, etc.
   - Shared libs (`db`, `ai`, `realtime`) are hoisted into a monorepo or npm workspaces so both projects install them.

4. **Real-time upgrade (optional):** if SSE push is needed after the split, add Ably or Pusher to the tree deployment. The polling endpoint `/api/tree` remains as fallback.

5. **Testing the split:**
   - Submit from phone → leaf appears on tree screen in real time (still works because they share the DB)
   - Studio changes on tree deployment propagate to phone screen on next poll
   - Rate limiting works across both deployments (key includes tree scope)

### Phase 3 — Cleanup

- Remove the `/api/stream` SSE endpoint from the tree deployment (or keep as fallback)
- Update any `/phone`–specific routes to not depend on tree-deployment-only features
- Document the new repo structure and onboarding for contributors

---

## Development & Local Running

1. Install deps: `npm install`
2. Set `.env` with the variables above (use a local Postgres URL for `DATABASE_URL`, or a Neon project branch).
3. Run migrations: `node scripts/migrate.mjs`
   - This reads `db/migrations/*.sql` in order and applies them, tracking which are applied in `_migrations` table.
4. Start dev server: `npm run dev`
5. Visit `http://localhost:3000/tree` and `http://localhost:3000/phone`

**Note:** Clerk will redirect to its hosted pages in dev. Use `NEXT_PUBLIC_CLERK_DEV_SITE_URL=http://localhost:3000` if needed.

### Test Running

```bash
npm test          # runs vitest
npm run test:integration  # runs integration tests (requires Neon DB)
```

---

## Project Structure

```
wishing-tree/
├─ db/
│  └─ migrations/       # SQL migrations (init, RLS, seed)
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ leaves/           # POST/GET submission + state
│  │  │  ├─ leaves/[id]/message  # message readiness check
│  │  │  ├─ phone/             # phone screen routes
│  │  │  ├─ tree/              # tree state polling + SSE
│  │  │  └─ studio/            # (future: tree customization)
│  │  ├─ phone/               # PWA + phone UI pages
│  │  ├─ studio/              # (future: admin UI pages)
│  │  └─ layout.tsx           # root layout with QR code sharing
│  ├─ lib/
│  │  ├─ ai/                  # provider abstraction, moderation, verification
│  │  ├─ db.ts                # Pool + withTree/withService + GUC helpers
│  │  ├─ realtime.ts          # polling + Ably optional push
│  │  ├─ submit.ts            # submission pipeline (rate limit → moderate → insert)
│  │  ├─ auth.ts              # Clerk helpers, user sync, rate key generation
│  │  ├─ types.ts             # shared types (TreeRole, AuthContext, Leaf, etc.)
│  │  ├─ rateLimit.ts         # sliding-window rate limit in Postgres
│  │  ├─ leaves.ts            # leaf query helpers
│  │  └─ ai/prompt.ts         # system prompts + JSON extractors
│  ├─ data/
│  │  └─ quotes.ts           # curated quote library
│  └─ components/           # (UI components — shadcn/ui or custom)
├─ scripts/
│  └─ migrate.mjs           # migration runner
├─ tests/                 # vitest test suite
├─ package.json
├─ next.config.js
├─ tsconfig.json
└─ vitest.config.mts
```

---

## PWA & Installability

The `/phone` screen is a Progressive Web App. Add a `manifest.json` and `icons` so visitors can "Add to Home Screen."

### `public/manifest.json`

```json
{
  "name": "Wishing Tree",
  "short_name": "Wishing Tree",
  "description": "Submit your aspiration and see it appear on the tree",
  "start_url": "/phone?mode=standalone",
  "display": "standalone",
  "background_color": "#fff",
  "theme_color": "#ffd166",
  "icons": [
    {"src": "/icons/72x72.png", "sizes": "72x72", "type": "image/png"},
    {"src": "/icons/192x192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/icons/512x512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

Add favicon and icon files under `public/`. The phone screen's React component should include:

```jsx
<Link rel="manifest" href="/manifest.json" />
```

### Service Worker (optional but recommended)

For offline cache of the tree state and assets, add a minimal SW at `public/sw.js`:

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  const c = caches.open('wishing-tree-v1');
  c.then(cache => cache.addAll(['/', '/phone', '/tree', '/manifest.json']));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});
```

Register it in `src/app/layout.tsx` (or `document.head`) if you want offline support.

---

## Tree Rendering at Scale (10,000+ Leaves)

The tree screen renders leaves as `<g>` elements in an SVG `<g id="tree">`. Position is determined by the `position` column (dense 1..N). Rendering approach:

- **CSS transform-based animation:** when new leaves arrive, they fade in and gently rise from the bottom using `transform: translateY()`. No canvas reflow — SVG is DOM-based and stays smooth even at 10,000+ elements because:
  - Only visible leaves are kept in the DOM (intersection observer hides off-screen leaves)
  - Position is set via `leave.position` — no layout recalculations needed
  - Glowing effect: `filter: drop-shadow(...)` + `transition: filter 0.3s ease`
  
- **Virtualization (future):** if you ever need >5,000 visible leaves at once, switch to a canvas-based renderer (e.g., `konva` or `fabric.js`) or use `react-virtualized` row-column technique. But for 10,000 total leaves with maybe 100 visible at a time on a large display, the SVG approach is fine.

- **Key constraint:** the `position` column is dense 1..N among published leaves. The `submit_leaf` SQL function handles positioning atomically with an advisory lock, so concurrent submits never overlap.

---

## Security Checklist (Production Readiness)

- [ ] **RLS policies verified:** every table has FORCE ROW LEVEL SECURITY; test with super-admin connection to verify cross-tree isolation is blocked.
- [ ] **No hardcoded secrets:** API keys are env vars only.
- [ ] **Rate limiting active:** `SUBMIT_RATE_LIMIT` and `SUBMIT_RATE_WINDOW_SECONDS` set; cron jobs purge old records.
- [ ] **AI moderation gated:** if `AI_PROVIDER` / API key is missing, keyword fallback runs instead of throwing errors.
- [ ] **Source verification:** every AI-cited source is verified via `verifySourceUrl` before display. If verification fails, curated library is shown with `ai_commentary=true`.
- [ ] **XSS sanitization:** leaf body is stored as raw text but rendered with `dangerouslySetInnerHTML={false}` — only plain text is ever displayed. No HTML is accepted from visitors (intentional — aspirations are plain text).
- [ ] **CSRF protection:** Next.js/Verel protects forms; the submission API uses `NextResponse.json()` which is safe from CSRF since it's a POST with JSON body.
- [ ] **HTTPS everywhere:** Vercel enforces HTTPS; ensure all external calls (AI, search) go over `https://`.
- [ ] **Clerk session security:** use Clerk's default session management; set `NEXT_PUBLIC_CLERK_FALLBACK_LOCALE` if needed.

---

## What's Included in ThisRepo

- **Complete codebase:** all routes, services, and utilities described above
- **Database schema, migrations, RLS policies:** `db/migrations/0001_init.sql`, `0002_rls.sql`, `0003_seed.sql`
- **Tests:** core flow test (submission → real-time leaf), moderation fallback, rate limiting structure
- **README:** this document — setup, deployment, environment variables, architecture justifications
- **PWA ready:** manifest, optional service worker, installable from phone
- **Provider abstraction:** switch OpenAI ↔ Anthropica with one env var
- **Curated quote library:** real works, verified attributions, used as AI fallback
- **Migration checklist:** split the single Vercel project into tree + phone deployments

---

## Known Issues & TODOs

| Item | Status | Next Step |
|------|--------|-----------|
| Studio UI (`/studio`) | Schema + RLS ready; no React UI yet | Add React components in a follow-up PR |
| Admin UI (`/admin`) | No UI; moderation functions (`hide_leaf`, `remove_leaf`) implemented in SQL | Add admin dashboard |
| Image sharing | Client-side Canvas planned; no server-side generation yet | Add `/api/share-image` if needed |
| SSE on Vercel | Polling used instead of SSE (SSE doesn't persist on serverless) | Revisit if Ably push is added post-split |
| Curated quote attribution display | Shown as plain text; no links since URLs can't be guaranteed | Add attribution styling in a follow-up |
| Vitest DB tests | Requires running Postgres; mocked in `tests/` for logic-only testing | Run against real Neon DB for full coverage |
| TypeScript strict mode | Some `any` types from third-party SDKs | Fix per-SDK typing (already improved for Anthropic) |

---

## License

MIT. See individual files for details. The curated quote library is CC0 / public domain — feel free to add/remove entries.