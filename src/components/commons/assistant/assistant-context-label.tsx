"use client";

import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { getAssistantSelectedStepLabels } from "@/helpers/assistant-context";
import { useWorkflowStore } from "@/stores/workflow";

export const AssistantContextLabel = () => {
  const pathname = usePathname();
  const labels = useWorkflowStore(useShallow((state) => getAssistantSelectedStepLabels(pathname, state)));

  if (labels.length === 0) return null;

  const text = `Selected: ${labels.join(", ")}`;

  return (
    <Badge variant="outline" title={text} className="text-muted-foreground max-w-full font-normal">
      <span className="truncate">{text}</span>
    </Badge>
  );
};
