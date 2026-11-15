# BI Tree — the Bhutanese Idea Tree

An interactive collective aspiration experience for Bhutan. Scan one QR code, share an anonymous hope, and watch a leaf join the reception tree. In return you get a private reply and a guide path into a real corner of Bhutan: temples, valleys, restaurants, heritage sites and folktales, served by a sourced travel guide and an agentic AI companion.

**Next.js 16, React 19, TypeScript, Tailwind 4, shadcn-style components with Radix, Three.js, Neon PostgreSQL and an OpenAI-compatible AI provider.** One Node server serves phones, the display, the explore guide, staff tools and the API.

## Start

Use **Node 22.13+ in the 22.x line**, or a newer supported release. The built-in SQLite warning on Node 22 is expected.

```powershell
npm install
npm run setup
npm run dev
```

Open http://localhost:3000. Setup creates `.env.local` with a random staff password in `ADMIN_PASSWORD` and a `MESSAGE_ENCRYPTION_KEY`. It preserves existing values and never prints them.

Set `DATABASE_URL` in `.env.local` to your PostgreSQL connection string (hosted Neon by default). The server creates its schema on first connect. Without `DATABASE_URL` the app has no persistence; the SQLite path (`DATABASE_PATH`) exists for the isolated test harness and offline tooling, not for deployment — Vercel's filesystem is ephemeral.

| Route        | Experience                                                           |
| ------------ | -------------------------------------------------------------------- |
| `/`          | Introduction, live tree preview, theme shortcuts                     |
| `/join`      | Visit type, theme, aspiration, consent, private reply and receipt    |
| `/voices`    | Optional CID + PIN sign-in and private previous notes/replies        |
| `/display`   | Reception tree, QR, queued leaf arrivals, reflection, fullscreen     |
| `/tree`      | Full-screen interactive Tree Studio, growth previews and exports     |
| `/explore`   | The Bhutan guide: four guide paths, places, folktales, AI companion  |
| `/leaf/[id]` | Public keepsake, sharing/copy fallback, downloadable SVG             |
| `/privacy`   | Participation, external processing, cookies and retention            |
| `/admin`     | Staff sign-in, hide/restore, demo data, counts and reflection        |

## Explore Bhutan

Every hope is routed to one of four guide paths, and `/explore` turns that hint into real places:

| Path | Theme               | Contents                                                       |
| ---- | ------------------- | -------------------------------------------------------------- |
| 1    | Sacred temples      | Paro Taktsang, Kyichu Lhakhang, Jambay Lhakhang, Chimi Lhakhang, Changangkha, Memorial Chorten, Buddha Dordenma, Simtokha |
| 2    | Valleys & nature    | Phobjikha Valley, the takin preserve, Dochu La, Punakha valley views |
| 3    | Taste of Bhutan     | Thimphu, Paro and Punakha restaurants from Wikivoyage "Eat" sections |
| 4    | Heritage & folktales| Dzongs and heritage sites, plus six documentary-citable folktales |

Content rules: **no invented places, restaurants or folktale titles.** Places and restaurants were collected from Wikivoyage city guides and Wikipedia, verified 2026-11-14, and each entry carries its `source_url`. Photos are Wikimedia Commons thumbnails with the license recorded in `image_credit`. Restaurant entries deliberately carry no photo — no freely licensed images of those businesses exist, and the guide does not fabricate imagery. Hours and prices change; listings are pointers, not guarantees. All data lives in `src/lib/bhutan-guide.ts` as static curated content; there are no extra database tables for it.

The six folktales are *The Tiger's Nest*, *The Divine Madman and the Takin*, *The Four Harmonious Friends*, *The Cranes of Gangtey*, *Druk, the Thunder Dragon* and *Migoi, the Glacier Being*, each with a sourced summary, an illustration from Commons where available, and a moral to carry home.

### The agentic guide

`POST /api/agent/chat` runs a small server-side plan → act → observe loop: the model may call `search_places`, `get_place`, `list_folktales` and `get_folktale` (JSON `{action}` / `{final}` protocol) for at most three iterations before answering. Model output passes the same local safety checks as the rest of the app. The conversation is intentionally stateless — history is held by the browser and sent with each request, so there is no per-visitor chat table. Any provider failure, timeout or malformed response degrades to a deterministic keyword-based offline guide; the UI labels offline replies.

## Enable AI

Set `AI_API_KEY` (and optionally `AI_BASE_URL`, `AI_MODEL`) in `.env.local`, leave `AI_MODE=auto`, and restart. The default model is `free-ai/mistral` on an OpenAI-compatible endpoint; any provider exposing Responses or Chat Completions structured output works. See [AI setup](docs/AI_SETUP.md) for provider configuration and troubleshooting.

Free text passes local checks, best-effort remote moderation, structured generation, schema validation and final output moderation before persistence. Keys stay server-side, generation requests use `store: false`, and visitor text is never sent when `AI_MODE=offline`.

No key, `AI_MODE=offline`, provider failure, malformed output or timeout activates the **curated offline fallback**. It uses keywords and the chosen theme to select a prewritten safe leaf. It never publishes raw input and labels its mode on the result. Moderation rejections never become fallback approvals.

Automated tests exercise the AI integration using a local protocol mock. Verify live account/model access with your own key before presenting.

## Procedural tree and TV display

The tree reuses the procedural branch/species/age algorithms from [Mike Fernandez's just-a-simple-tree](https://github.com/MikeFernandez-Pro/just-a-simple-tree). Adapted MIT-licensed modules and the retained licence are in `src/vendor/just-a-simple-tree/`. The source revision and changes are documented in [UPSTREAM.md](src/vendor/just-a-simple-tree/UPSTREAM.md).

Our renderer adds BI Tree palettes, wind, foliage, deterministic visitor markers, queued arrivals, accessible leaf selection and an adaptive camera. The full-viewport layout keeps the tree, QR and message panel visible in either orientation. Tested viewport sizes include 1080×1920, 2160×3840, 1920×1080, 3840×2160, 1280×720 and phones. The physical TV and browser still need an on-site check.

Portrait keeps a vertical sequence: title, tree, controls, horizontal themes, centered story and QR. The camera frames the tree in the upper area while keeping a continuous full-screen sky/ground canvas, so zoomed branches can extend behind transparent content. Stories have a fixed area: public leaves are limited to 100 characters and displayed reflections to 160, with graceful truncation. Landscape retains its existing overlay positions.

Submitted receipts add a sourced Bhutan guide recommendation, the current tree with the visitor's leaf highlighted, a tree PNG download (standalone SVG without WebGL), a separate leaf SVG, and an **Explore this in Bhutan** link into `/explore`. Downloads contain only public tree/leaf content.

3D uses WebGL2; WebGPU is not required. If WebGL is unavailable or the context is lost, the interactive illustrated tree takes over. Staff can choose illustration explicitly. Automatic quality caps pixel density and foliage work; reduced-motion mode renders only when the view changes. Tree visuals are generated locally without external image, font or music downloads.

### Interactive Tree Studio

Open `/tree`, or choose **Customize tree** on the reception screen. Drag the tree to orbit; scroll or pinch to zoom. The view also has zoom/reset buttons and keyboard arrows, plus/minus, and Home. Press H to hide/show the panel, or Space to choose a new seed while not editing a field.

The studio follows the reference project's layout: six species on the left, five palettes across the top, and a collapsible customization panel. Controls cover branching, trunk/root shape, spread, crookedness, leaf shape/size, season, custom colours, wind/flutter, camera rotation, lighting, grass and performance. Manual age mode uses the upstream leaf-cluster painters for a full reference-style canopy.

Everyone can experiment locally; **Save to reception** requires staff sign-in. Preview counts never create visitor records and are never saved with the settings. PNG, GLB and configuration exports capture the current preview. JSON import validates the same settings schema before applying a local preview. GLB is a static snapshot of the currently grown geometry, without live wind or future arrivals.

### Growth from visitor hopes

The default `growthMode` is `contributions`. At zero approved hopes the tree is a small bare sapling, with **zero decorative leaves**. Each accepted contribution adds a leaf. Its growth attributes unfold and thicken the same branch geometry continuously, and branches extend as the count increases. The initial camera frame stays fixed so growth is visibly larger rather than being cancelled by automatic zoom.

`leavesForMaturity` controls the pace (48 by default). At higher counts the tree continues to expand gradually. Hidden leaves stop contributing; rejected and duplicate submissions do not add growth. Existing approved contributions still count. The studio's **Bare** preview shows the empty start without changing records.

The live renderer draws individual contribution leaves, capped at 2,400 in low quality and 6,000 in high quality. Above those limits, the canopy is an aggregate visual sample; every accepted record remains in PostgreSQL and total counts still drive growth. Up to 120 recent leaves remain individually selectable. The illustration fallback also starts bare and scales with contributions.

## Phones and display

1. Connect the host laptop, phones and display to the same Wi-Fi.
2. Find the laptop's Wi-Fi IPv4 address using `ipconfig`.
3. Open `http://YOUR-LAPTOP-IP:3000/display` on the display. The QR derives its address from that browser URL.
4. Scan from a phone. Allow Node through the private-network firewall if Windows prompts.
5. Optionally set `NEXT_PUBLIC_APP_URL` to a fixed browser-reachable address and restart/rebuild. Leave it blank for automatic origin detection.

`localhost` on a phone means the phone itself. Use the laptop IP. UUID generation and the share-link fallback work on LAN HTTP; native sharing/clipboard depend on browser support and a secure context.

For a stable presentation:

```powershell
npm run build
npm start
```

Run one Node server and one database. Keep the connection string server-side. The offline experience needs no internet after dependencies are installed; only the AI guide and remote moderation need the network, and both degrade gracefully.

## Staff tools

Sign into `/admin` using `ADMIN_PASSWORD` from `.env.local`. Signed HttpOnly SameSite sessions expire after eight hours. Changing the password and restarting invalidates sessions. Login attempts are limited.

- Load 24 labelled demo leaves; repeated loading preserves that demo set.
- Hide/restore a leaf; hidden leaves return 404 publicly and disappear from connected displays.
- Remove demo leaves while keeping visitor contributions.
- Search/filter recent leaves, view theme and AI/fallback counts, and refresh reflection.
- **Tree & display:** preview oak, pine, willow or cypress; choose spring, blossom, autumn or night colours; set seed, maturity, density, angle, breeze, quality and headline. Save to update connected displays. Pause new submissions while keeping the existing tree visible.
- **Visitor messages:** search and paginate original words, public interpretations and moderation outcomes. Hide/restore a linked leaf, or delete private words and hide it. Contact details are redacted and private messages encrypted before storage. Older leaves have no recoverable original words.

Setup also generates a server-only `MESSAGE_ENCRYPTION_KEY`. Keep it stable and back it up alongside the database; changing or losing it can make private history unreadable.

Staff operations are audited locally. The public tree renders up to 120 leaves; older approved leaves remain in PostgreSQL and can be retrieved with cursor pagination or keepsake URLs.

## Reliability and privacy

- Unique request keys and fingerprints protect retries. Changed content with an old key returns 409. Concurrent retries share one in-flight task in the single server process.
- SSE sends database snapshots when the revision changes, with 15-second reconciliation. The display queues arrivals and reconciles removals.
- Display caching stores approved public data for up to a day. Connection loss keeps the tree visible. A disconnected screen learns about removals after reconnecting.
- Default rate limits: five attempts per signed browser cookie per ten minutes, plus 60 global attempts per minute. Cookies can be cleared, so this is abuse control rather than bot-proof identity. The AI agent is stateless and is not behind a database rate-limit table; treat provider spend controls as infrastructure configuration.
- After form consent, redacted original words and moderation outcomes are encrypted and stored privately for staff review. Public reads contain only approved leaf fields. Application code stores no visitor IP addresses. See `/privacy` for processing and retention details.
- Phone drafts and retry keys survive refresh in tab-local session storage. Successful receipts recover after refresh. Short leaf codes connect a phone result to the public display.
- Transactions, constraints and server timestamps protect persistence. Day counts use Asia/Thimphu.
- Reflections describe participating visitors' themes, not a representative survey. Demo leaves are flagged throughout.
- Guide path numbers keep the existing `chamber_id` column so the schema is unchanged; the four paths are the BI Tree guide re-theme. Thematic pathways remain project recommendations. Bhutan guide facts link to the source that supports them.

## Returning visitors

Visitors choose first or returning without adding a required note step. After submitting, **Add my CID (optional)** offers private history protected by an 11-digit CID and private 6-digit PIN. Open `/voices` or **My voices** on the join screen on a later visit. While signed in, subsequent submissions are linked automatically. Sign out on shared devices; this also clears the current tab's receipt and draft.

Raw CIDs and PINs are never stored or sent to AI. CID lookup uses a keyed HMAC; PINs use salted scrypt. Only the browser that submitted a note can initially link it. History reads require a 12-hour HttpOnly session and are not cached. Sign-in is rate limited. A forgotten PIN cannot be recovered. Removing a visit profile deletes credentials, links and sessions while preserving anonymous leaves and staff records. This is self-asserted visit history, not government identity verification. Existing leaves from before ownership tracking cannot be claimed by entering a public leaf ID.

## Code map

```text
src/app/                 Pages and API routes (incl. /explore and /api/agent/chat)
src/features/home/       Introduction and live preview
src/features/join/       Guided mobile submission and visitor history
src/features/display/    Growing branch model, orbit camera, 3D/fallback and kiosk
src/features/studio/     Full-screen authoring, controls, growth previews and exports
src/features/explore/    Bhutan guide and agentic companion UI
src/features/guide/      Shared guide presentation pieces
src/features/leaf/       Result, share and SVG download
src/features/admin/      Staff console
src/components/ui/       Local shadcn-style components
src/lib/                 Types, catalog, bhutan-guide data, schemas and browser helpers
src/hooks/use-tree.ts    SSE, reconciliation, offline state and cache
src/server/db/           PostgreSQL/SQLite adapter, queries and transactions
src/server/services/     AI, moderation, fallback, reflection and the guide agent
src/server/auth.ts       Signed sessions and authorization
src/server/http.ts       Bounded body parsing and origin checks
src/vendor/just-a-simple-tree/  Adapted geometry and retained MIT licence
scripts/                 Setup, smoke test and isolated test harness
tests/                   Browser, API, guide and mocked-AI tests
docs/AI_SETUP.md         Provider setup for the BI Tree AI layer
```

## Validate

```powershell
npm run typecheck
npm run lint
npm run build
```

The end-to-end suite needs the isolated harness, which starts `next start` instances on ports 3100/3101 and an AI provider mock on 3102, with timestamped databases under `data/tests/`. It never uses the real API key or event database. Ports must be free.

```powershell
node scripts/test-server.mjs   # leave running in its own terminal
npx playwright test            # in a second terminal
```

`npm run test:smoke` runs against an existing server (`TEST_BASE_URL` overrides localhost:3000). It creates six real test leaves in that database. Prefer the isolated suite for clean event data.

## Known limitations

- **Neon connectivity:** during the BI Tree rebuild the configured Neon endpoint accepted TCP but stalled the PostgreSQL SSL request (`SELECT` never completed) from this network. Verify the project is active and the client IP is allowed in the Neon console before deploying; the app needs a reachable `DATABASE_URL`.
- **`npm audit`:** six moderate advisories come from the `minimatch` chain pulled in by `@typescript-eslint` (tooling only, no runtime exposure). `npm audit fix --force` would downgrade or break the lint toolchain, so it is intentionally not applied.
- **Unused legacy dependencies:** `@clerk/nextjs`, `ably` and `@anthropic-ai/sdk` remain listed from the original import. Nothing imports them; removing them churns the lockfile and is deferred to a maintenance pass.
