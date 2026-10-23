import type { WorkflowNodeStatus } from "@/types/workflow";

// The pill a node shows while a run has reached it, on the canvas and in the node panel.
export const NODE_STATUS_PILLS: Record<Exclude<WorkflowNodeStatus, "idle">, { className: string; label: string }> = {
  running: { className: "bg-indigo-100 text-indigo-700", label: "Running" },
  success: { className: "bg-emerald-100 text-emerald-700", label: "Done" },
  failed: { className: "bg-rose-100 text-rose-700", label: "Failed" },
  skipped: { className: "bg-slate-200 text-slate-600", label: "Skipped" },
  waiting_for_input: { className: "bg-amber-100 text-amber-800", label: "Needs input" },
  waiting_for_review: { className: "bg-amber-100 text-amber-800", label: "Needs review" },
  cancelled: { className: "bg-slate-200 text-slate-600", label: "Cancelled" },
};
