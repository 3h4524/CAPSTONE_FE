import { describe, expect, it } from "vitest";

import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import {
  approachViewport,
  centerOf,
  choosePreviewSide,
  getRunFocusIds,
  summarizeRun,
  widenForPreviews,
  withLiveListing,
} from "@/helpers/workflow-run-view";
import type { WorkflowNode, WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";

const node = (type: WorkflowNodeType, status: WorkflowNodeStatus, progress = 0): WorkflowNode => {
  const created = createWorkflowNode(type, { x: 0, y: 0 });
  return { ...created, measured: { width: 200, height: 100 }, data: { ...created.data, status, progress } };
};

describe("getRunFocusIds", () => {
  it("follows the running steps", () => {
    const running = node("design-image", "running");
    expect(getRunFocusIds([node("product-input", "success"), running])).toEqual([running.id]);
  });

  it("keeps a step whose output is still being shown", () => {
    const listing = node("generate-listing", "success");
    expect(getRunFocusIds([listing], [listing.id])).toEqual([listing.id]);
  });

  it("holds on a step that needs the person when nothing runs", () => {
    const review = node("approval-gate", "waiting_for_review");
    const failed = node("generate-video", "failed");
    expect(getRunFocusIds([node("design-image", "success"), review, failed])).toEqual([review.id, failed.id]);
  });

  it("has nothing to follow once every step is done", () => {
    expect(getRunFocusIds([node("design-image", "success")])).toEqual([]);
  });
});

describe("summarizeRun", () => {
  it("counts the step at work and the share done", () => {
    const summary = summarizeRun([
      node("product-input", "success"),
      node("design-image", "running", 50),
      node("generate-video", "idle"),
    ]);
    expect(summary).toMatchObject({ phase: "running", current: 2, total: 3, percent: 50, names: ["Design image"] });
  });

  it("reports a failure before anything else", () => {
    const summary = summarizeRun([node("design-image", "failed"), node("approval-gate", "waiting_for_review")]);
    expect(summary?.phase).toBe("failed");
  });

  it("reports a finished run at 100%", () => {
    expect(summarizeRun([node("design-image", "success"), node("generate-video", "skipped")])).toMatchObject({
      phase: "done",
      percent: 100,
    });
  });

  it("has nothing to say without steps", () => {
    expect(summarizeRun([])).toBeNull();
  });
});

describe("withLiveListing", () => {
  it("shows the listing as running while it streams", () => {
    const listing = node("generate-listing", "idle");
    expect(withLiveListing([listing], true)[0].data.status).toBe("running");
    expect(withLiveListing([listing], false)[0].data.status).toBe("idle");
  });
});

describe("widenForPreviews", () => {
  const bounds = { x: 0, y: 0, width: 200, height: 100 };

  it("makes room for a preview beside the node", () => {
    expect(widenForPreviews(bounds, [node("design-image", "running")]).width).toBe(
      200 + RUN_PREVIEW_GAP + RUN_PREVIEW_WIDTH
    );
  });

  it("makes room for the clips beside Generate Video", () => {
    expect(widenForPreviews(bounds, [node("generate-video", "running")]).width).toBe(
      200 + RUN_PREVIEW_GAP + RUN_PREVIEW_WIDTH
    );
  });

  it("leaves other nodes as they are", () => {
    expect(widenForPreviews(bounds, [node("review-video", "running")])).toEqual(bounds);
  });

  it("makes room on the left when the preview goes there", () => {
    const video = node("generate-video", "running");
    const neighbour = { ...node("publish-printify", "running"), position: { x: 260, y: 0 } };
    const widened = widenForPreviews(bounds, [video], [video, neighbour]);
    expect(widened.x).toBe(-RUN_PREVIEW_GAP - RUN_PREVIEW_WIDTH);
    expect(widened.x + widened.width).toBe(200);
  });
});

describe("choosePreviewSide", () => {
  const node = { x: 0, y: 0, width: 200, height: 300 };

  it("puts the preview on the right when nothing is there", () => {
    expect(choosePreviewSide(node, [{ x: -600, y: 0, width: 200, height: 300 }])).toBe("right");
  });

  it("moves it to the left when a node is on the right", () => {
    expect(choosePreviewSide(node, [{ x: 280, y: 40, width: 240, height: 120 }])).toBe("left");
  });

  it("puts it below, then above, when both sides are taken", () => {
    const sides = [{ x: 280, y: 0, width: 240, height: 300 }, { x: -400, y: 0, width: 240, height: 300 }];
    expect(choosePreviewSide(node, sides)).toBe("bottom");
    expect(choosePreviewSide(node, [...sides, { x: 0, y: 340, width: 200, height: 200 }])).toBe("top");
  });

  it("takes the side that covers the least when every side covers a node", () => {
    const crowded = [
      { x: 220, y: 0, width: 40, height: 40 },
      { x: -400, y: 0, width: 400, height: 400 },
      { x: 0, y: 320, width: 400, height: 400 },
      { x: 0, y: -400, width: 400, height: 400 },
    ];
    expect(choosePreviewSide(node, crowded)).toBe("right");
  });
});

describe("centerOf", () => {
  it("is the dot itself when one dot travels", () => {
    expect(centerOf([{ x: 40, y: 90 }])).toEqual({ x: 40, y: 90 });
  });

  it("is halfway between two dots", () => {
    expect(centerOf([{ x: 0, y: 100 }, { x: 200, y: 300 }])).toEqual({ x: 100, y: 200 });
  });

  it("has nothing to follow without dots", () => {
    expect(centerOf([])).toBeNull();
  });
});

describe("approachViewport", () => {
  const size = { width: 800, height: 600 };

  it("lands with the focus in the middle of the canvas once settled", () => {
    const settled = approachViewport({ x: 400 - 100 * 1.5, y: 300 - 50 * 1.5, zoom: 1.5 }, { x: 100, y: 50 }, size, 1.5, 0.2);
    expect(settled).toEqual({ x: 250, y: 225, zoom: 1.5 });
  });

  it("moves only part of the way each frame", () => {
    const next = approachViewport({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0 }, size, 1, 0.25);
    expect(next.x).toBeCloseTo(100);
    expect(next.y).toBeCloseTo(75);
  });
});
