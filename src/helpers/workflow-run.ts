import type { WorkflowNodeStatus } from "@/types/workflow";

export const toCanvasStatus = (status: string): WorkflowNodeStatus => {
  switch (status) {
    case "running": return "running";
    case "succeeded": return "success";
    case "failed": return "failed";
    case "waiting_for_input": return "waiting_for_input";
    case "waiting_for_review": return "waiting_for_review";
    case "cancelled": return "cancelled";
    case "skipped": return "skipped";
    default: return "idle";
  }
};
