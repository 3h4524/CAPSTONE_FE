import { Check, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { ASSISTANT_TOOL_LABELS } from "@/constants/assistant";
import type { AssistantToolActivity } from "@/types/assistant";

type AssistantToolStatusProps = {
  tools: AssistantToolActivity[];
};

export const AssistantToolStatus = ({ tools }: AssistantToolStatusProps) => (
  <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
    {tools.map((tool) => (
      <li key={tool.callId} className="flex items-center gap-1.5">
        {tool.status === "running" ? <Spinner className="size-3" /> : null}
        {tool.status === "ok" ? <Check className="size-3" aria-hidden="true" /> : null}
        {tool.status === "failed" ? <TriangleAlert className="size-3" aria-hidden="true" /> : null}
        <span>{ASSISTANT_TOOL_LABELS[tool.name] ?? tool.name}</span>
      </li>
    ))}
  </ul>
);
