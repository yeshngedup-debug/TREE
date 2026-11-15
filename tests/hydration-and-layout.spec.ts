import { test, expect } from "@playwright/test";

test("form-filling browser attributes are normalized before hydration", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      /hydrat|didn.t match|Minified React error #4(18|23|25)/i.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const seen = new WeakSet<Element>();
    const mark = (node: Node) => {
      if (!(node instanceof Element)) return;
      for (const element of [node, ...node.querySelectorAll("button,input")]) {
        if (!element.matches("button,input") || seen.has(element)) continue;
        seen.add(element);
        element.setAttribute("fdprocessedid", "extension-injected");
      }
    };
    new MutationObserver((records) =>
      records.forEach((record) => record.addedNodes.forEach(mark)),
    ).observe(document, { subtree: true, childList: true });
  });
  for (const path of ["/join", "/explore", "/display"]) {
    await page.goto(path);
    await expect(page.locator("#form-attribute-compatibility")).toHaveCount(1);
    await expect(
      page.locator('[fdprocessedid="extension-injected"]'),
    ).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

for (const width of [1440, 320]) {
  test(`server-rendered pages hydrate cleanly with the 3D tree at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("console", (message) => {
      if (
        /hydrat|server rendered|didn.t match|Minified React error #4(18|23|25)/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    // A hard load and a fresh client navigation must both reach the single 3D
    // renderer without a hydration mismatch or a second tree in the DOM.
    await page.goto("/");
    await expect(page.locator(".procedural-tree")).toHaveAttribute(
      "data-renderer",
      "3d",
    );
    await expect(page.locator(".tree-fallback")).toHaveCount(0);
    await page.goto("/explore");
    await page
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await expect(page.locator(".procedural-tree")).toHaveAttribute(
      "data-renderer",
      "3d",
    );
    await expect(page.locator(".procedural-tree canvas")).toHaveCount(1);
    for (const path of [
      "/",
      "/join",
      "/explore",
      "/discover",
      "/create",
      "/privacy",
      "/display",
      "/tree",
      "/admin",
    ]) {
      await page.goto(path);
      if (["/", "/display", "/tree"].includes(path))
        await expect(page.locator(".procedural-tree")).toHaveAttribute(
          "data-renderer",
          "3d",
        );
      else if (path === "/admin")
        await expect(
          page.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
      else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("staff sidebar works on desktop and as a keyboard-accessible mobile drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await page.getByLabel("Staff password").fill("test-only-staff-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const sections = page.getByRole("navigation", { name: "Staff sections" });
  await expect(sections).toBeVisible();
  await expect(
    sections.getByRole("button", { name: "Public leaves", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: "test-results/redesign-admin-overview.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sections).not.toBeVisible();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Close sidebar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(sections).not.toBeVisible();
  await menu.click();
  await sections
    .getByRole("button", { name: "Visitor messages", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Visitor voices", exact: true }),
  ).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(sections).not.toBeVisible();
  await menu.click();
  await sections
    .getByRole("button", { name: "Tree & display", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Shape the living tree" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/redesign-admin-mobile-settings.png",
    fullPage: true,
  });
  await menu.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});
