import { Check, TriangleAlert } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { summariseToolActivity } from "@/helpers/assistant-tool-activity";
import type { AssistantToolActivity } from "@/types/assistant";

type AssistantToolStatusProps = {
  tools: AssistantToolActivity[];
  isStreaming: boolean;
};

export const AssistantToolStatus = ({ tools, isStreaming }: AssistantToolStatusProps) => {
  const steps = summariseToolActivity(tools);

  if (!isStreaming) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Check className="size-3 shrink-0" aria-hidden="true" />
        <span>{steps.map((step) => step.label).join(" · ")}</span>
      </p>
    );
  }

  return (
    <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
      {steps.map((step) => (
        <li key={step.key} className="flex items-center gap-1.5">
          {step.status === "running" ? <Spinner className="size-3" /> : null}
          {step.status === "ok" ? <Check className="size-3" aria-hidden="true" /> : null}
          {step.status === "failed" ? <TriangleAlert className="size-3" aria-hidden="true" /> : null}
          <span>{step.label}</span>
        </li>
      ))}
    </ul>
  );
};
