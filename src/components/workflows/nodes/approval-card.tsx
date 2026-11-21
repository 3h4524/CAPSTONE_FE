"use client";

import { useTranslation } from "react-i18next";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import { getSelectFieldLabel, getSelectFieldOptions, readString } from "@/helpers/workflow-config";
import { countApprovals, productsAwaitingReview } from "@/helpers/workflow-run";
import { groupVideoDecision, useGroupVideos } from "@/hooks/queries/use-group-videos";
import { useNodeSettingsLocked } from "@/hooks/use-node-settings-locked";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";
import type { NodeProps } from "@xyflow/react";

const MANUAL_HINT_KEYS: Partial<Record<WorkflowNodeType, string>> = {
  "design-approval": "workflowEditor.approvalCard.manualHints.designApproval",
  "approval-gate": "workflowEditor.approvalCard.manualHints.approvalGate",
  "review-video": "workflowEditor.approvalCard.manualHints.reviewVideo",
};

export const ApprovalCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { t } = useTranslation("common");
  const job = useWorkflowRunStore((state) => state.job);
  const { videos } = useGroupVideos();
  // Design approval counts its designs; Review Video counts the videos of the open batch video run, a failed one
  // standing where a rejected design does. Without a batch video run Review Video has nothing to count.
  const videoStates = videos.map(groupVideoDecision);
  const rejectedVideos = videoStates.filter((state) => state === "rejected").length;
  // With automatic approval, only the products whose content check could not run are left to count.
  const heldProducts = data.type === "design-approval" && job?.requireApproval === false ? productsAwaitingReview(job) : [];
  const counts =
    data.type === "design-approval" && job?.requireApproval === true
      ? { ...countApprovals(job), rejectedKey: "workflowEditor.approvalCard.rejected" }
      : job && heldProducts.length > 0
        ? { ...countApprovals({ ...job, products: heldProducts }), rejectedKey: "workflowEditor.approvalCard.rejected" }
      : data.type === "review-video" && videoStates.length > 0
        ? {
            approved: videoStates.filter((state) => state === "approved").length,
            rejected: rejectedVideos + videoStates.filter((state) => state === "stopped").length,
            pending: videoStates.filter((state) => state !== "approved" && state !== "rejected" && state !== "stopped")
              .length,
            rejectedKey: rejectedVideos > 0 ? "workflowEditor.approvalCard.rejected" : "workflowEditor.approvalCard.failed",
          }
        : null;
  const mode = readString(data.config.mode);
  const manualHintKey = MANUAL_HINT_KEYS[data.type];
  const hint =
    mode === "auto" && data.type === "design-approval"
      ? t("workflowEditor.approvalCard.autoHints.designApproval")
      : mode === "auto" && data.type === "approval-gate"
        ? t("workflowEditor.approvalCard.autoHints.approvalGate")
        : mode === "auto" && data.type === "review-video"
          ? t("workflowEditor.approvalCard.autoHints.reviewVideo")
          : manualHintKey && t(manualHintKey);
  const total = counts ? counts.approved + counts.rejected + counts.pending : 0;
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const disabled = useNodeSettingsLocked(data.type);
  const modeOptions = getSelectFieldOptions(data.type, "mode").map((option) => ({
    ...option,
    label:
      option.value === "manual"
        ? t("workflowEditor.approvalCard.manual")
        : t("workflowEditor.approvalCard.auto"),
  }));

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        {data.type === "design-approval" ||
        data.type === "approval-gate" ||
        data.type === "review-video" ? (
          <NodeSegmented
            options={modeOptions}
            value={mode}
            onChange={(next) => updateNodeConfig(id, { ...data.config, mode: next })}
            disabled={disabled}
            ariaLabel={t("workflowEditor.fields.design-approval.mode.label")}
          />
        ) : (
          <NodeField
            value={t(`workflowEditor.fields.${data.type}.mode.options.${mode}.label`, {
              defaultValue: getSelectFieldLabel(data.type, "mode", mode),
            })}
            placeholder={t("workflowEditor.fields.design-approval.mode.options.manual.label")}
          />
        )}

        {data.type === "review-video" && !counts && (
          <NodeReadonlyText placeholder={t("workflowEditor.approvalCard.waitingForCut")} />
        )}

        {counts && total > 0 && (
          <>
            <div
              className="bg-wf-line flex h-1.5 gap-px overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <span
                className="bg-wf-ok h-full"
                style={{ width: `${(counts.approved / total) * 100}%` }}
              />
              <span
                className="bg-wf-fail h-full"
                style={{ width: `${(counts.rejected / total) * 100}%` }}
              />
              <span className="bg-wf-line h-full flex-1" />
            </div>
            <p className="text-wf-dim flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] leading-none">
              <span className="flex items-center gap-1">
                <span className="bg-wf-ok size-1.5 rounded-full" aria-hidden="true" />
                {t("workflowEditor.approvalReview.approvedCount", { count: counts.approved })}
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-wf-fail size-1.5 rounded-full" aria-hidden="true" />
                {counts.rejected} {t(counts.rejectedKey)}
              </span>
              <span className={cn("flex items-center gap-1", counts.pending > 0 && "text-wf-warn")}>
                <span className="bg-wf-line size-1.5 rounded-full" aria-hidden="true" />
                {t("workflowEditor.approvalCard.pendingCount", { count: counts.pending })}
              </span>
            </p>
          </>
        )}

        {hint && <p className="text-wf-faint px-0.5 text-[10px] leading-4">{hint}</p>}
      </div>
    </NodeFrame>
  );
};
