import { estimateWorkflowRun } from "@/api/run-groups";
import { askCostConfirm } from "@/stores/cost-confirm";

// The AI video cost confirmed on Run, kept for this tab until the videos start: the designs and mock-ups are made
// first, possibly across a reload, and only then does the batch video run start and read it.
const budgetKey = (workflowId: string) => `apcs:run-ai-budget:${workflowId}`;

const remember = (workflowId: string, amount: number | null) => {
  try {
    if (amount && amount > 0) sessionStorage.setItem(budgetKey(workflowId), String(amount));
    else sessionStorage.removeItem(budgetKey(workflowId));
  } catch {
    // Storage blocked: the AI cost is then confirmed at Mockup Approval instead.
  }
};

/** Takes the AI budget confirmed on Run, once: the batch video run it is handed to is the only one that uses it. */
export const takeRunAiBudget = (workflowId: string): number | undefined => {
  try {
    const stored = sessionStorage.getItem(budgetKey(workflowId));
    sessionStorage.removeItem(budgetKey(workflowId));
    const amount = stored === null ? Number.NaN : Number(stored);
    return Number.isFinite(amount) && amount > 0 ? amount : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Shows what a Run of the saved workflow is expected to cost, item by item, and resolves true when the seller goes
 * ahead. A Run that bills nothing starts without asking. When the estimate cannot be read the Run goes ahead: paid AI
 * clips are then still confirmed at Mockup Approval, with their exact cost.
 */
export async function confirmRunCost(workflowId: string): Promise<boolean> {
  remember(workflowId, null);
  let estimate;
  try {
    estimate = await estimateWorkflowRun(workflowId);
  } catch {
    return true;
  }
  if (estimate.totalUsd <= 0) return true;

  const confirmed = await askCostConfirm({
    title: "Confirm the cost of this run",
    description:
      estimate.aiVideoBudgetUsd > 0
        ? "With Mockup Approval on Approve automatically, the videos start without asking again as long as their exact cost stays within this estimate."
        : undefined,
    lines: estimate.items.map((item) => ({ label: item.label, detail: item.detail, amountUsd: item.estimatedCostUsd })),
    totalUsd: estimate.totalUsd,
    note: estimate.note,
    confirmLabel: "Run",
  });
  if (confirmed) remember(workflowId, estimate.aiVideoBudgetUsd);
  return confirmed;
}
