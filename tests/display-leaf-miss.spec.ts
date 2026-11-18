import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("an unknown leaf id in the deep link shows a dismissible notice on the live tree", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  // The kiosk waits for the public snapshot, then allows 8s for the leaf to
  // arrive before calling it missing. A random id can never match, so the
  // notice must appear — that is the whole contract of the deep link.
  const missing = randomUUID();
  await page.goto(`/display?leaf=${missing}`);
  const banner = page.locator(".kiosk-leaf-miss");
  await expect(banner).toBeVisible({ timeout: 12_000 });
  await expect(banner).toContainText(/on the public tree/i);
  await expect(banner).toContainText(/in review/i);
  await page.getByRole("button", { name: "Dismiss this message" }).click();
  await expect(banner).toBeHidden();
});
