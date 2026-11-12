import type { WorkflowNodeStatus } from "@/types/workflow";

// The pill a node shows while a run has reached it, on the canvas and in the node panel.
export const NODE_STATUS_PILLS: Record<Exclude<WorkflowNodeStatus, "idle">, { className: string; label: string }> = {
  running: { className: "bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300", label: "Running" },
  success: { className: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", label: "Done" },
  failed: { className: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300", label: "Failed" },
  skipped: { className: "bg-ink-200 text-ink-600", label: "Skipped" },
  waiting_for_input: { className: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300", label: "Needs input" },
  waiting_for_review: { className: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300", label: "Needs review" },
  cancelled: { className: "bg-ink-200 text-ink-600", label: "Cancelled" },
};
