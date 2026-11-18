/**
 * One-command isolated E2E run.
 *
 * Every run gets a throwaway pair of SQLite databases (offline-AI tree on
 * 3100, mock-provider tree on 3101, mock provider on 3102) via
 * scripts/test-server.mjs, executes the Playwright suite against them, and
 * deletes the databases afterwards. Production (Neon) and any long-lived
 * local database are never touched.
 *
 * Requires a production build first (npm run build) — the servers use
 * `next start`. Exit code is Playwright's exit code.
 *
 * Usage: node scripts/e2e-isolated.mjs [--headed] [playwright args...]
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { resolve } from "node:path";

if (!existsSync(resolve(".next/BUILD_ID"))) {
  console.error(
    "No production build found (.next/BUILD_ID missing).\nRun `npm run build` first, then re-run this script.",
  );
  process.exit(1);
}

const testsDir = resolve("data/tests");
const before = new Set(
  existsSync(testsDir) ? readdirSync(testsDir) : [],
);

function freshDbFiles() {
  if (!existsSync(testsDir)) return [];
  return readdirSync(testsDir)
    .filter((name) => name.endsWith(".sqlite") && !before.has(name))
    .map((name) => resolve(testsDir, name));
}

const server = spawn(process.execPath, [resolve("scripts/test-server.mjs")], {
  stdio: "inherit",
});

function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;
  if (process.platform === "win32") {
    // test-server.mjs swallows signals; kill the whole tree instead.
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGKILL");
  }
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

async function waitFor(url, attempts = 180) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let exitCode = 1;
try {
  await waitFor("http://127.0.0.1:3100/api/leaves");
  await waitFor("http://127.0.0.1:3102/counts");
  console.log("Isolated test servers are up (3100 offline tree, 3101 mock-AI tree).");
  const playwrightArgs = process.argv.slice(2);
  exitCode = await new Promise((resolvePromise) => {
    const runner = spawn(
      process.execPath,
      [resolve("node_modules/playwright/cli.js"), "test", ...playwrightArgs],
      {
        stdio: "inherit",
        env: { ...process.env, BASE_URL: "http://127.0.0.1:3100" },
      },
    );
    runner.on("exit", (code) => resolvePromise(code ?? 1));
  });
} finally {
  stopServer();
  // Give taskkill a moment, then remove only the databases this run created.
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  for (const file of freshDbFiles()) {
    try {
      if (statSync(file).isFile()) unlinkSync(file);
    } catch {
      /* locked files get cleaned up on the next run's sweep */
    }
  }
}
process.exit(exitCode);
