import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const hope =
  "May every child find a classroom full of light and kindness.";

async function countOscillators(page: import("@playwright/test").Page) {
  return page.evaluate(
    () => (window as unknown as { __chimes?: number }).__chimes ?? 0,
  );
}

test("the kiosk pins an arrival slip for a new leaf and rings its chime", async ({
  page,
  request,
}) => {
  test.setTimeout(45_000);
  // Count chime oscillators instead of relying on the headless audio device.
  await page.addInitScript(() => {
    const target = window as unknown as {
      __chimes?: number;
      AudioContext?: unknown;
    };
    class Param {
      setValueAtTime() {
        return this;
      }
      exponentialRampToValueAtTime() {
        return this;
      }
    }
    class Oscillator {
      type = "sine";
      frequency = new Param();
      connect() {
        return this;
      }
      start() {
        target.__chimes = (target.__chimes ?? 0) + 1;
      }
      stop() {}
    }
    class Gain {
      gain = new Param();
      connect() {
        return this;
      }
    }
    class Context {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator() {
        return new Oscillator();
      }
      createGain() {
        return new Gain();
      }
      resume() {
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: Context,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/display");
  await expect(
    page.locator(".kiosk-caption").getByText("A living collection"),
  ).toBeVisible();
  // A tap arms the audio context, exactly as a passing visitor would.
  await page
    .getByRole("button", { name: "Send a breeze through the tree" })
    .click();

  const created = await request.post("/api/contributions", {
    data: {
      aspiration: hope,
      theme: "education",
      consent: true,
      idempotencyKey: randomUUID(),
    },
  });
  expect(created.status()).toBe(201);
  const leafMessage = ((await created.json()) as {
    leaf: { leaf_message: string };
  }).leaf.leaf_message;

  const notice = page.locator(".kiosk-notice");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/new hope/i);
  await expect(notice).toContainText(leafMessage);
  await expect(notice).toContainText(/opportunity/i);
  await expect(page.locator('[role="status"]')).toContainText(
    "A new hope just arrived",
  );
  await expect.poll(() => countOscillators(page)).toBeGreaterThan(0);
  await expect(notice).toBeHidden({ timeout: 9_000 });
});

test("the arrival sound can be muted and the choice survives a reload", async ({
  page,
}) => {
  await page.goto("/display");
  const shell = page.locator(".kiosk-shell");
  await expect(shell).toHaveAttribute("data-sound", "on");
  await page.getByRole("button", { name: "Mute arrival sound" }).click();
  await expect(shell).toHaveAttribute("data-sound", "off");
  await expect(
    page.getByRole("button", { name: "Enable arrival sound" }),
  ).toBeVisible();
  await page.reload();
  await expect(shell).toHaveAttribute("data-sound", "off");
  await page.getByRole("button", { name: "Enable arrival sound" }).click();
  await expect(shell).toHaveAttribute("data-sound", "on");
});
