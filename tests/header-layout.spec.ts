import { test, expect } from "@playwright/test";

/**
 * Guards the ≤1023px stacking contract for .site-header: the nav owns its own
 * full-width row below the brand/CTA row and never overlaps "Share an idea".
 * Regression cover for the header/CTA collision fixed in 09d415fe (the stack
 * used to kick in only at ≤767px). Without this test a one-line breakpoint
 * revert silently reintroduces the bug.
 */
const TOL = 1;

async function headerBoxes(page: import("@playwright/test").Page) {
  const nav = await page.locator(".site-header-nav").boundingBox();
  const share = await page.locator(".site-header-share").boundingBox();
  expect(nav, "nav should be rendered").not.toBeNull();
  expect(share, "CTA should be rendered").not.toBeNull();
  return { nav: nav!, share: share! };
}

for (const width of [320, 360, 640, 768, 900, 1023]) {
  test(`site header stacks nav below the brand/CTA row at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "load" });
    const { nav, share } = await headerBoxes(page);
    // Stacked: nav owns the second row, entirely below the brand/CTA row.
    expect(nav.y).toBeGreaterThanOrEqual(share.y + share.height - TOL);
    // And the two boxes never intersect in both axes.
    const overlapX =
      Math.min(nav.x + nav.width, share.x + share.width) -
      Math.max(nav.x, share.x);
    const overlapY =
      Math.min(nav.y + nav.height, share.y + share.height) -
      Math.max(nav.y, share.y);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
  });
}

for (const width of [1024, 1366, 1920]) {
  test(`site header keeps nav and CTA side by side at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "load" });
    const { nav, share } = await headerBoxes(page);
    // Inline: CTA renders entirely to the right of the nav on the same line.
    expect(nav.x + nav.width).toBeLessThanOrEqual(share.x + TOL);
    expect(Math.abs(nav.y - share.y)).toBeLessThanOrEqual(16);
  });
}
