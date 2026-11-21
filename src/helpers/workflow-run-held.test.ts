import { describe, expect, it } from "vitest";

import { deriveNodeStatuses, productsAwaitingReview } from "@/helpers/workflow-run";
import type { BatchJobDetail, BatchJobProductResult } from "@/types/batch-jobs";
import type { WorkflowNode } from "@/types/workflow";

const product = (id: string, ...statuses: string[]): BatchJobProductResult => ({
  id,
  productId: id,
  productName: `Product ${id}`,
  productType: "tshirt",
  sequence: 1,
  status: "approved",
  errorMessage: null,
  images: statuses.map((approvalStatus, index) => ({
    id: `${id}-${index}`,
    imageUrl: `https://img.example/${id}-${index}.png`,
    variationIndex: index + 1,
    widthPx: 512,
    heightPx: 512,
    approvalStatus,
  })),
});

const job = (requireApproval: boolean, products: BatchJobProductResult[]): BatchJobDetail => ({
  id: "job",
  batchId: "batch",
  batchName: "Batch",
  status: "completed",
  totalProducts: products.length,
  processedProducts: products.length,
  failedProducts: 0,
  progressPercentage: 100,
  startedAt: null,
  completedAt: null,
  variationCount: 2,
  aspectRatio: "1:1",
  counters: { pending: 0, processing: 0, completed: products.length, failed: 0 },
  products,
  requireApproval,
});

const approvalNode = { id: "approval", type: "workflow", position: { x: 0, y: 0 }, data: { type: "design-approval", label: "Design approval", config: { mode: "auto" }, status: "idle" } } as unknown as WorkflowNode;

describe("productsAwaitingReview", () => {
  it("names the products with designs to review and none approved", () => {
    const awaiting = productsAwaitingReview(
      job(false, [product("a", "approved", "pending"), product("b", "pending", "pending"), product("c", "rejected"), product("d")])
    );

    expect(awaiting.map((item) => item.id)).toEqual(["b"]);
  });
});

describe("deriveNodeStatuses with automatic approval", () => {
  it("asks for a review when a design could not be checked and so was not approved", () => {
    const statuses = deriveNodeStatuses([approvalNode], {
      step: "watching",
      job: job(false, [product("a", "approved"), product("b", "pending")]),
      mockupState: "done",
    });

    expect(statuses.approval).toBe("waiting_for_review");
  });

  it("is done once every product has an approved design", () => {
    const statuses = deriveNodeStatuses([approvalNode], {
      step: "watching",
      job: job(false, [product("a", "approved"), product("b", "rejected", "approved")]),
      mockupState: "done",
    });

    expect(statuses.approval).toBe("success");
  });
});
