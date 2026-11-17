# Verification protocol — BI Tree

How to prove a change ships clean before calling it done. Written after the award-caliber UI/UX pass; every trap below actually bit once, so they are written down.

## 1. Fast gates (before every commit)

| Gate | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` (eslint `src`) | exit 0 |
| Production build | `npm run build` | exit 0; route table lists `/icon.svg` (favicon fix) |
| E2E | `npm run test:e2e` | hits a live server, never spawns one |

E2E needs a running app. The suite defaults to `BASE_URL=http://127.0.0.1:3100` (see `playwright.config.ts`); do **not** point the suite at your dev server on port 3000 or run it twice against it — some specs mutate (admin sign-in, community posts).

## 2. Runtime verification against a production build

1. `npm run build`
2. Kill any stale process listening on the verification port:
   `Get-NetTCPConnection -LocalPort 3100 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
3. Start detached so it survives the shell:
   `Start-Process npm.cmd -ArgumentList "run","start","--","-p","3100" -WindowStyle Hidden`
4. Wait ~7s, then `Invoke-WebRequest http://localhost:3100/api/health` → expect HTTP 200.
5. **Stale-serve trap:** `next start` keeps serving the *old* `.next` output until rebuild + restart. Never verify against a server started before the last build. To confirm the new build is actually served, grep the CSS asset the page ships for your marker rule, e.g. `1023` for the header breakpoint — not the source file.
6. **Console measurement trap:** the Playwright console buffer accumulates across the whole session, and rebuild windows (kill → port dead → relaunch) fill it with `ERR_CONNECTION_REFUSED` / `ERR_CONNECTION_RESET` bursts on `/api/tree/stream` and `/api/leaves`. Those are artifacts, not app bugs. Measure with `all: false` (messages since the last navigation) **after a fresh navigation**, then re-measure once more on a second fresh navigation before trusting a zero count. Critical user flows verified this way showed 0 errors; the residual warnings below are the accepted baseline.

### Accepted warnings (do not "fix")

| Warning | Why it stands |
|---|---|
| `THREE.WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.` | The 3D renderer is frozen by project requirement. The alias is a one-line change in the renderer's shadow-map type if the freeze is ever lifted — changing it now would re-render the Living Tree, which is out of scope. |
| `<chunk>.css was preloaded using link preload but not used within a few seconds` ×2 | Next.js link-preload heuristic; the chunk is unused at load time by design. Informational only. |

## 3. Responsive matrix

Verify at **360, 390, 430, 768, 1024, 1366, 1920** (+320 smoke where cheap):

- Header: `.site-header-nav` and the Share CTA must not intersect at any width — stacked ≤1023 (nav owns its own full-width row), single-row ≥1024. Enforced by `tests/header-layout.spec.ts`; a one-line breakpoint revert fails CI/local runs.
- Hero: Fraunces headline with legible cream kicker (contrast fixed, not regressed).
- Kiosk `/display`: 3D renderer untouched, QR on the solid white panel, Outfit headline, `.tree-camera-controls > span` label frozen at 9px.
- `document.documentElement.scrollWidth <= innerWidth` — no horizontal scroll (also asserted in `hydration-and-layout.spec.ts`).

## 4. Evidence discipline

- Screenshots from verification runs are working artifacts, not deliverables: write them to session temp (e.g. `%TEMP%\opencode\audit-shots\`) and delete stale root-level captures. Named `fixed_*` only if captured **after** the fix, never before.
- Every "verified" claim in a report maps to a command output or a screenshot above — no claim without one.
- Commit with conventional prefixes (`fix(ui): …`, `feat(ui): …`); keep commits scoped and verifiable with `git diff --stat`.

## 5. Database hygiene (test data)

- Audit/test accounts use the `audit_%` username prefix; their posts cascade into likes, bookmarks, comments, reports and `community_tree_leaves`. `approved_leaves` (the Living Tree source of truth) is **not** reached by cascading deletes — cleanup there is a separate, explicit decision (`status='hidden'` is the reversible option).
- Verify with a read-only query before any destructive statement; run deletes in **one transaction** with a post-delete `count(*) = 0` guard that rolls back on failure.

## 6. Known-good baselines

- Console (fresh navigations): `/` → 0 errors / 3 warnings (1 three.js + 2 CSS preload); `/display` → 0 errors / 1 warning (three.js). If you see `favicon.ico` 404, `src/app/icon.svg` was removed or renamed.
- `/api/health` over LAN: 200. Neon cold-wake latency 2–4s is normal; size waits in e2e accordingly.
