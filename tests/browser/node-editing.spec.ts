import { DEFAULT_WORKFLOW_DEFINITION } from "@/constants/workflow";
import { expect, type Page, test } from "@playwright/test";

const workflowId = "c7d9f6a3-1d79-4e42-9cb9-37a67f14a434";

const definition = structuredClone(DEFAULT_WORKFLOW_DEFINITION);
const workflow = {
  id: workflowId,
  name: "Node editing workflow",
  description: "Inline settings, dirty tracking and connection checks",
  nodeCount: definition.nodes.length,
  revision: 1,
  createdAt: "2026-10-05T00:00:00Z",
  updatedAt: "2026-10-05T00:00:00Z",
  definition,
};

const mockApi = async (page: Page, onSave: (body: unknown) => void) => {
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
    else if (path === `/api/workflows/${workflowId}`) {
      if (method === "GET") json = workflow;
      else {
        onSave(route.request().postDataJSON());
        json = { ...workflow, revision: workflow.revision + 1 };
      }
    }
    await route.fulfill({
      json,
      headers: { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" },
    });
  });
};

const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
const saveButton = (page: Page) => page.getByRole("button", { name: "Save" });

const dragNodeBy = async (page: Page, id: string, dx: number, dy: number) => {
  const box = await node(page, id).boundingBox();
  if (!box) throw new Error(`node ${id} is not visible`);
  const startX = box.x + 4;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 4 });
  await page.mouse.up();
};

let savedBodies: unknown[] = [];

test.beforeEach(async ({ page }) => {
  savedBodies = [];
  await mockApi(page, (body) => savedBodies.push(body));
  await page.goto(`/workflows?id=${workflowId}`);
  await expect(node(page, "export")).toBeVisible();
});

test("the default workflow opens as a 3x3 grid", async ({ page }) => {
  const box = async (id: string) => {
    const value = await node(page, id).boundingBox();
    if (!value) throw new Error(`node ${id} is not visible`);
    return value;
  };
  const [input, prompt, design, approval, mockup, review] = await Promise.all(
    ["input", "prompt", "design", "design-approval", "mockup", "review"].map(box)
  );
  expect(input.x).toBeLessThan(prompt.x);
  expect(prompt.x).toBeLessThan(design.x);
  expect(Math.abs(input.y - design.y)).toBeLessThan(4);
  expect(approval.y).toBeGreaterThan(design.y);
  expect(Math.abs(approval.x - design.x)).toBeLessThan(4);
  expect(mockup.x).toBeLessThan(approval.x);
  expect(review.y).toBeGreaterThan(mockup.y);
});

test("the Save button stays disabled on a clean workflow", async ({ page }) => {
  await expect(saveButton(page)).toBeDisabled();
});

test("a tiny nudge does not ask to save but a real move does", async ({ page }) => {
  await dragNodeBy(page, "input", 3, 2);
  await expect(saveButton(page)).toBeDisabled();
  await dragNodeBy(page, "input", 160, 120);
  await expect(saveButton(page)).toBeEnabled();
});

test("ctrl+s saves a moved node with its new position and clears the dirty state", async ({ page }) => {
  const before = await node(page, "input").boundingBox();
  await dragNodeBy(page, "input", 160, 120);
  await expect(saveButton(page)).toBeEnabled();
  await page.keyboard.press("Control+s");
  await expect.poll(() => savedBodies.length).toBe(1);
  await expect(saveButton(page)).toBeDisabled();
  const body = savedBodies[0] as { definition: { nodes: { id: string; position: { x: number; y: number } }[] } };
  const moved = body.definition.nodes.find((item) => item.id === "input");
  expect(moved?.position).not.toEqual({ x: 0, y: 0 });
  const after = await node(page, "input").boundingBox();
  expect(after?.x).toBeGreaterThan((before?.x ?? 0) + 100);
});

test("ctrl+s does nothing when nothing changed", async ({ page }) => {
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(500);
  expect(savedBodies).toHaveLength(0);
});

test("typing in the prompt node marks the workflow dirty and saves the instructions", async ({ page }) => {
  const field = node(page, "prompt").getByRole("textbox", { name: "Extra instructions" });
  await field.fill("Use bold retro colors");
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();
  await expect.poll(() => savedBodies.length).toBe(1);
  const body = savedBodies[0] as { definition: { nodes: { id: string; config: { instructions?: string } }[] } };
  expect(body.definition.nodes.find((item) => item.id === "prompt")?.config.instructions).toBe("Use bold retro colors");
  await expect(saveButton(page)).toBeDisabled();
});

test("editing a node and reverting it keeps the workflow clean", async ({ page }) => {
  const field = node(page, "prompt").getByRole("textbox", { name: "Extra instructions" });
  await field.fill("temporary");
  await expect(saveButton(page)).toBeEnabled();
  await field.fill("");
  await expect(saveButton(page)).toBeDisabled();
});

test("connecting a node to a step that is not next explains why", async ({ page }) => {
  const source = node(page, "input").locator(".react-flow__handle.source");
  const target = node(page, "design");
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("handle or node is not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText(/Steps run in order|already connected/)).toBeVisible();
});

test("the palette lists every category and its nodes", async ({ page }) => {
  const palette = page.locator("aside").first();
  for (const label of ["Trigger", "AI generation", "Review", "Output"]) {
    await expect(palette.getByRole("heading", { name: label })).toBeVisible();
  }
});
