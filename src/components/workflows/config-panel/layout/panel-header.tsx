import { createContext, type ReactNode, useContext } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { WORKFLOW_CATEGORIES, WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { WORKFLOW_CATEGORY_THEME } from "@/constants/workflow-category-theme";
import { NODE_STATUS_PILLS } from "@/constants/workflow-status";
import { findPipelinePosition } from "@/helpers/workflow-panel";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";

type PanelHeaderProps = {
  node: WorkflowNode;
  onClose: () => void;
  /** Shown under the description, such as a switch between the node's views. */
  children?: ReactNode;
};

/**
 * Whether the header shows its own close button. A sheet that has a close button of its own turns it off, so the
 * corner does not show two.
 */
export const PanelHeaderCloseContext = createContext(true);

// The selected node's name, kind, place in the run and run status, with what the step does underneath.
export const PanelHeader = ({ node, onClose, children }: PanelHeaderProps) => {
  const { t } = useTranslation("common");
  const showClose = useContext(PanelHeaderCloseContext);
  const nodes = useWorkflowStore((state) => state.nodes);
  const definition = WORKFLOW_NODE_DEFINITIONS[node.data.type];
  const category = WORKFLOW_CATEGORIES.find((item) => item.id === definition.category);
  const theme = WORKFLOW_CATEGORY_THEME[definition.category];
  const pill = node.data.status === "idle" ? null : NODE_STATUS_PILLS[node.data.status];
  const position = findPipelinePosition(node.data.type, nodes);
  const Icon = definition.icon;

  return (
    <div className="border-b px-5 pt-4 pb-4">
      {/* Without a close button of its own, room is left for the sheet's in the corner. */}
      <div className={cn("flex items-start gap-3", !showClose && "pr-8")}>
        <Icon className={cn("mt-0.5 size-4.5 shrink-0", theme.icon)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-ink-900 truncate text-base leading-snug font-semibold">{node.data.label}</h2>
          <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
            {category && <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", theme.chip)}>{t(`workflowEditor.categories.${category.id}`, { defaultValue: category.label })}</span>}
            {position && <span className="truncate">{t("workflowConfig.panel.stepOf", { step: position.index + 1, total: position.steps.length })}</span>}
            {pill && <span className={cn("shrink-0 rounded px-1.5 py-px text-[11px] font-medium", pill.className)}>{t(`workflowEditor.nodeStatuses.${node.data.status}`, { defaultValue: pill.label })}</span>}
          </p>
        </div>
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-ink-500 -mt-1 -mr-2 shrink-0 hover:translate-y-0"
            aria-label={t("workflowConfig.panel.closeNodeSettings")}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t(`workflowEditor.nodeTypes.${node.data.type}.description`, { defaultValue: definition.description })}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
