import { describe, expect, it } from "vitest";

import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import { getRunFocusIds, summarizeRun, widenForPreviews, withLiveListing } from "@/helpers/workflow-run-view";
import type { WorkflowNode, WorkflowNodeStatus, WorkflowNodeType } from "@/types/workflow";

const node = (type: WorkflowNodeType, status: WorkflowNodeStatus, progress = 0): WorkflowNode => {
  const created = createWorkflowNode(type, { x: 0, y: 0 });
  return { ...created, data: { ...created.data, status, progress } };
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

  it("leaves other nodes as they are", () => {
    expect(widenForPreviews(bounds, [node("generate-video", "running")])).toEqual(bounds);
  });
});
