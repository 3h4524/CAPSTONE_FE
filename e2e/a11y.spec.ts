import AxeBuilder from "@axe-core/playwright";
import type { TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";

const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"];

const assertNoBlockingViolations = async (
  violations: AxeViolations,
  route: string,
  testInfo: TestInfo
) => {
  const blocking = violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""));

  await testInfo.attach(`axe-${route.replaceAll("/", "-") || "root"}.json`, {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });

  expect(blocking, `blocking a11y violations on ${route}`).toEqual([]);
};

test.describe("accessibility", () => {
  // /features wraps its sections in Reveal, which starts every section at opacity 0 and fades it in
  // on scroll. axe samples whatever frame it lands on, so an animating section reads as a
  // near-background foreground colour and reports a contrast violation that the settled page does
  // not have. `reduce` makes Reveal render its children statically, which both skips the animation
  // and reveals the below-the-fold sections the whileInView animation would otherwise leave at
  // opacity 0.
  test.use({ reducedMotion: "reduce" });

  for (const route of ["/", "/features"]) {
    test(`no serious or critical violations on ${route}`, async ({ page }, testInfo) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const results = await new AxeBuilder({ page }).analyze();

      await assertNoBlockingViolations(results.violations, route, testInfo);
    });
  }
});