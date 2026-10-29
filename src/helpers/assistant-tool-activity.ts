import { ASSISTANT_FALLBACK_TOOL_LABEL, ASSISTANT_TOOL_LABELS } from "@/constants/assistant";
import type { AssistantToolActivity } from "@/types/assistant";

export type AssistantToolSummary = { key: string; label: string; status: AssistantToolActivity["status"] };

const statusOf = (calls: AssistantToolActivity[]): AssistantToolActivity["status"] => {
  if (calls.some((call) => call.status === "running")) return "running";
  return calls.some((call) => call.status === "failed") ? "failed" : "ok";
};

export const summariseToolActivity = (tools: AssistantToolActivity[]): AssistantToolSummary[] => {
  const byName = new Map<string, AssistantToolActivity[]>();
  tools.forEach((tool) => byName.set(tool.name, [...(byName.get(tool.name) ?? []), tool]));
  return [...byName.entries()].map(([name, calls]) => {
    const status = statusOf(calls);
    const labels = ASSISTANT_TOOL_LABELS[name] ?? ASSISTANT_FALLBACK_TOOL_LABEL;
    return { key: name, label: status === "running" ? labels.running : labels.done, status };
  });
};
