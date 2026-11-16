import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

for (const size of [
  { width: 1080, height: 1920 },
  { width: 2160, height: 3840 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`portrait has a stable centered vertical sequence at ${size.width}px`, async ({
    page,
    request,
  }) => {
    const settings = (await (await request.get("/api/tree/settings")).json())
      .settings;
    const leaves = [
      {
        id: randomUUID(),
        leaf_message: "A hopeful Bhutan.",
        category: "nature",
        chamber_id: 2,
      },
      {
        id: randomUUID(),
        leaf_message:
          "May Bhutan make room for every generation to learn, belong and care for our shared future together.",
        category: "education",
        chamber_id: 3,
      },
    ].map((leaf) => ({
      ...leaf,
      chamber_reason: "Discover Bhutan",
      created_at: new Date().toISOString(),
      mode: "offline",
      is_demo: false,
    }));
    await page.route("**/api/tree/stream", (route) => route.abort());
    await page.route("**/api/leaves", (route) =>
      route.fulfill({
        json: {
          leaves,
          total: 2,
          stats: { total: 2, demo: 0, today: 2, categories: {} },
          reflection: {
            body: "A reflection of our visitors' hopes. ".repeat(20),
            created_at: new Date().toISOString(),
            mode: "offline",
          },
          revision: 1,
          serverTime: new Date().toISOString(),
          settings,
        },
      }),
    );
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/display");
    await expect(page.locator(".kiosk-feature blockquote")).toContainText(
      "A hopeful Bhutan.",
    );
    const selectors = [
      ".kiosk-controls",
      ".kiosk-feature",
      ".kiosk-qr-panel",
    ];
    const boxes = () =>
      Promise.all(
        selectors.map((selector) => page.locator(selector).boundingBox()),
      );
    const [controls, feature, qr] = await boxes();
    // Portrait sequence: the quote sits above the scan card and the dock,
    // which share the last row.
    expect(feature!.y + feature!.height).toBeLessThanOrEqual(qr!.y + 1);
    expect(controls!.y).toBeGreaterThanOrEqual(feature!.y + feature!.height - 1);
    expect(qr!.y + qr!.height).toBeLessThan(size.height);
    expect(controls!.y + controls!.height).toBeLessThan(size.height);
    await page
      .getByRole("button", { name: /Opportunity: May Bhutan/ })
      .click();
    await expect(page.locator(".kiosk-feature blockquote")).toContainText(
      "every generation",
    );
    const after = await boxes();
    expect(after[2]!.y + after[2]!.height).toBeLessThanOrEqual(size.height);
    expect(after[0]!.y).toBeGreaterThanOrEqual(
      after[1]!.y + after[1]!.height - 1,
    );
    await page.getByRole("button", { name: "Close selected leaf" }).click();
    await page.waitForTimeout(18500);
    const quote = await page.locator(".kiosk-feature blockquote").innerText();
    expect(quote.length).toBeLessThanOrEqual(160);
    const settled = await boxes();
    expect(settled[2]!.y + settled[2]!.height).toBeLessThanOrEqual(
      size.height,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/portrait-sequence-${size.width}.png`,
    });
  });
}

test("admin can save only the display title and update a connected display", async ({
  page,
  request,
}) => {
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  expect(
    (
      await request.patch("/api/admin/tree", {
        data: { headline: "Our shared hopes" },
      })
    ).status(),
  ).toBe(401);
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  try {
    await page.goto("/display");
    await expect(page.locator(".kiosk-heading h1")).toHaveText(
      original.headline,
    );
    expect(
      (
        await request.patch("/api/admin/tree", {
          data: { headline: "x".repeat(91) },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.patch("/api/admin/tree", {
          data: { headline: "Our shared hopes" },
        })
      ).status(),
    ).toBe(200);
    await expect(page.locator(".kiosk-heading h1")).toHaveText(
      "Our shared hopes",
    );
    const changed = (await (await request.get("/api/tree/settings")).json())
      .settings;
    expect(changed).toEqual({ ...original, headline: "Our shared hopes" });
    await page.goto("/admin");
    await page.getByLabel("Staff password").fill("test-only-staff-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Tree & display", exact: true })
      .click();
    await page
      .getByLabel("Display headline")
      .fill("Growing together in Thimphu");
    await page
      .getByRole("button", { name: "Save display title", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Tree settings saved");
    expect(
      (await (await request.get("/api/tree/settings")).json()).settings
        .headline,
    ).toBe("Growing together in Thimphu");
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});
