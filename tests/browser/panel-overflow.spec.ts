import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { expect, type Page, test } from "@playwright/test";

const workflowId = "f2c3d4e5-6a7b-4c8d-9e0f-1a2b3c4d5e6f";

const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
const workflow = {
  id: workflowId,
  name: "Panel overflow workflow",
  description: "",
  nodeCount: definition.nodes.length,
  revision: 1,
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
  definition,
};

const mockApi = async (page: Page) => {
  const origin = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:3101").origin;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = [];
    if (path === "/api/auth/me")
      json = { id: "u1", email: "a@b.test", fullName: "Tester", roles: ["User", "Seller"] };
    else if (path === "/api/workflows/capabilities")
      json = { definitionVersion: 2, nodes: definition.nodes.map((n) => ({ type: n.type, enabled: true, description: "ok" })), videoModes: [] };
    else if (path === "/api/workflows") json = [workflow];
    else if (path === `/api/workflows/${workflowId}`) json = workflow;
    await route.fulfill({ json, headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" } });
  });
};

type PanelOverflow = { element: string; overBy: number };

const findPanelOverflows = (page: Page) =>
  page.evaluate(() => {
    const separator = document.querySelector('[role="separator"]');
    const panel = separator?.closest("aside");
    if (!panel) return [{ element: "panel not found", overBy: 999 }];
    const frame = panel.getBoundingClientRect();
    const found: { element: string; overBy: number }[] = [];
    panel.querySelectorAll<HTMLElement>("*").forEach((element) => {
      if (element === separator || separator?.contains(element)) return;
      if (element.closest("svg") && element.tagName !== "svg") return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      let over = Math.max(rect.right - frame.right, frame.left - rect.left);
      for (let ancestor = element.parentElement; ancestor && ancestor !== panel; ancestor = ancestor.parentElement) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (overflowX !== "hidden" && overflowX !== "clip") continue;
        const clip = ancestor.getBoundingClientRect();
        if (rect.left < clip.right) over = Math.max(over, rect.right - clip.right);
      }
      if (over > 0.5) {
        const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 36) ?? element.tagName;
        found.push({ element: `${element.tagName.toLowerCase()}:${label}`, overBy: Math.round(over) });
      }
    });
    return found;
  });

const NODE_IDS = ["input", "prompt", "design", "design-approval", "mockup", "approval", "video", "review", "export"];

for (const id of NODE_IDS) {
  test(`the ${id} panel keeps everything inside its width`, async ({ page }) => {
    await mockApi(page);
    await page.goto(`/workflows?id=${workflowId}`);
    const node = page.locator(`.react-flow__node[data-id="${id}"]`);
    await expect(node).toBeVisible();
    await node.click({ position: { x: 4, y: 14 } });
    await expect(page.locator("aside").last().getByRole("button", { name: "Delete node" })).toBeVisible();
    await page.waitForTimeout(500);
    const overflows: PanelOverflow[] = await findPanelOverflows(page);
    expect(overflows).toEqual([]);
  });
}
