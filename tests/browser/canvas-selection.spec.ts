import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { expect, type Page, test } from "@playwright/test";

const workflowId = "b6b8e5f2-9c68-4d31-b8ab-26f56ef03323";

const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
const workflow = {
  id: workflowId,
  name: "Selection workflow",
  description: "Canvas selection checks",
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
    const method = route.request().method();
    let json: unknown = [];
    if (path === "/api/auth/me")
      json = { id: "user-1", email: "fixture@example.test", fullName: "Workflow tester", roles: ["User", "Seller"] };
    else if (path === "/api/workflows/capabilities")
      json = {
        definitionVersion: 2,
        nodes: definition.nodes.map((n) => ({ type: n.type, enabled: true, description: "Available" })),
        videoModes: [],
      };
    else if (path === "/api/workflows") json = [workflow];
    else if (path === `/api/workflows/${workflowId}`)
      json = method === "GET" ? workflow : { ...workflow, revision: workflow.revision + 1 };
    await route.fulfill({
      json,
      headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" },
    });
  });
};

const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.goto(`/workflows?id=${workflowId}`);
  await expect(node(page, "export")).toBeVisible();
});

test("a single click focuses one node in the side panel", async ({ page }) => {
  await node(page, "input").click({ position: { x: 4, y: 14 } });
  await expect(page.getByRole("heading", { name: "Product input" })).toBeVisible();
  await expect(page.getByText("nodes selected")).toBeHidden();
});

test("ctrl-click adds nodes to the selection", async ({ page }) => {
  await node(page, "input").click({ position: { x: 4, y: 14 } });
  await page.keyboard.down("Control");
  await node(page, "prompt").click({ position: { x: 4, y: 14 } });
  await page.keyboard.up("Control");
  await expect(page.getByRole("heading", { name: "2 nodes selected" })).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "2 nodes selected" })).toBeVisible();
});

test("ctrl-a selects every node and escape clears the selection", async ({ page }) => {
  await node(page, "input").click({ position: { x: 4, y: 14 } });
  await page.keyboard.press("Control+a");
  await expect(page.getByRole("heading", { name: "9 nodes selected" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("nodes selected")).toBeHidden();
});

test("ctrl-d duplicates the selected nodes", async ({ page }) => {
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await node(page, "design").click({ position: { x: 4, y: 14 } });
  await page.keyboard.down("Control");
  await node(page, "mockup").click({ position: { x: 4, y: 14 } });
  await page.keyboard.up("Control");
  await page.keyboard.press("Control+d");
  await expect(page.locator(".react-flow__node")).toHaveCount(11);
  await expect(page.getByRole("heading", { name: "2 nodes selected" })).toBeVisible();
});

test("ctrl-c and ctrl-v copy and paste the selected nodes", async ({ page }) => {
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await node(page, "design").click({ position: { x: 4, y: 14 } });
  await page.keyboard.down("Control");
  await node(page, "mockup").click({ position: { x: 4, y: 14 } });
  await page.keyboard.up("Control");
  await page.keyboard.press("Control+c");
  await expect(page.getByText("Copied 2 nodes.")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await page.keyboard.press("Control+v");
  await expect(page.locator(".react-flow__node")).toHaveCount(11);
  await expect(page.getByRole("heading", { name: "2 nodes selected" })).toBeVisible();
  await page.keyboard.press("Control+v");
  await expect(page.locator(".react-flow__node")).toHaveCount(13);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".react-flow__node")).toHaveCount(11);
});

test("clicking the canvas background clears the selection", async ({ page }) => {
  await node(page, "input").click({ position: { x: 4, y: 14 } });
  await expect(page.getByRole("heading", { name: "Product input" })).toBeVisible();
  await page.mouse.click(1200, 800);
  await expect(page.getByText("nodes selected")).toBeHidden();
});

test("the shortcut cheatsheet lists the canvas keys", async ({ page }) => {
  await page.getByRole("button", { name: "Canvas shortcuts" }).click();
  await expect(page.getByRole("dialog")).toContainText("Select all nodes");
  await expect(page.getByRole("dialog")).toContainText("Duplicate selected nodes");
  await expect(page.getByRole("dialog")).toContainText("Copy selected nodes");
  await expect(page.getByRole("dialog")).toContainText("Paste copied nodes");
  await page.screenshot({ path: ".next/workflow-ui-results/canvas-selection.png", fullPage: true });
});

test("ctrl-z undoes a node delete and ctrl-y redoes it", async ({ page }) => {
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await node(page, "export").click({ position: { x: 4, y: 14 } });
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
  await page.keyboard.press("Control+z");
  await expect(page.locator(".react-flow__node")).toHaveCount(9);
  await page.keyboard.press("Control+y");
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
});

test("ctrl-s saves the workflow", async ({ page }) => {
  await node(page, "design").click({ position: { x: 4, y: 14 } });
  await page.keyboard.press("Control+d");
  await page.keyboard.press("Control+s");
  await expect(page.getByText("Selection workflow was saved.")).toBeVisible();
});
