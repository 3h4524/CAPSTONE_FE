import { estimateWorkflowRun } from "@/api/run-groups";
import { askCostConfirm } from "@/stores/cost-confirm";

/**
 * Shows what a Run of the saved workflow is expected to cost, item by item, and resolves true when the seller goes
 * ahead. Only what the Run still has to make is listed (no design for a product that has one, no model photo for a
 * design that has one). This is the only confirmation: the run then goes to the end by itself, model photos and AI
 * clips included. A Run that bills nothing, or whose estimate cannot be read, starts without asking.
 */
export async function confirmRunCost(workflowId: string): Promise<boolean> {
  let estimate;
  try {
    estimate = await estimateWorkflowRun(workflowId);
  } catch {
    return true;
  }
  if (estimate.totalUsd <= 0) return true;

  return askCostConfirm({
    title: "Confirm the cost of this run",
    description: "The run goes to the end by itself: nothing asks to confirm a cost again.",
    lines: estimate.items.map((item) => ({ label: item.label, detail: item.detail, amountUsd: item.estimatedCostUsd })),
    totalUsd: estimate.totalUsd,
    note: estimate.note,
    confirmLabel: "Run",
  });
}
