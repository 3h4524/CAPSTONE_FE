"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { getAssistantSelectedStepLabels } from "@/helpers/assistant-context";
import { useWorkflowStore } from "@/stores/workflow";

export const AssistantContextLabel = () => {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const labels = useWorkflowStore(useShallow((state) => getAssistantSelectedStepLabels(pathname, state)));

  if (labels.length === 0) return null;

  const text = t("commons.assistant.selected", { labels: labels.join(", ") });

  return (
    <Badge variant="outline" title={text} className="text-muted-foreground max-w-full font-normal">
      <span className="truncate">{text}</span>
    </Badge>
  );
};
