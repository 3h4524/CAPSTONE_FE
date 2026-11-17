"use client";

import { useTranslation } from "react-i18next";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeTextInput } from "@/components/workflows/nodes/node-text-input";
import { readString } from "@/helpers/workflow-config";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import { useNodeSettingsLocked } from "@/hooks/use-node-settings-locked";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const TEMPLATE_PAGE_SIZE = 48;

export const PromptCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { t } = useTranslation("common");
  const templateId = readString(data.config.designTemplateId);
  const styleId = readString(data.config.stylePresetId);
  const instructions = readString(data.config.instructions);
  const { data: systemTemplates, isPending: systemLoading } = useDesignTemplates({
    pageNumber: 1,
    pageSize: TEMPLATE_PAGE_SIZE,
    scope: "system",
  });
  const { data: personalTemplates, isPending: personalLoading } = useDesignTemplates({
    pageNumber: 1,
    pageSize: TEMPLATE_PAGE_SIZE,
    scope: "personal",
  });
  const { data: presets, isPending: presetsLoading } = useStylePresets();
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const disabled = useNodeSettingsLocked(data.type);
  const templates = [...(personalTemplates?.items ?? []), ...(systemTemplates?.items ?? [])].filter(
    (template, index, list) => list.findIndex((item) => item.id === template.id) === index
  );
  const template = templates.find((item) => item.id === templateId);
  const style = presets?.find((item) => item.id === styleId);
  const templateOptions = templates.map((item) => ({
    value: item.id,
    label: item.isSystemTemplate
      ? item.name
      : t("workflowEditor.promptCard.mine", { name: item.name }),
    hint:
      [item.nicheCategory, item.artStyle].filter(Boolean).join(" · ") ||
      (item.isSystemTemplate
        ? t("workflowEditor.promptCard.systemTemplate")
        : t("workflowEditor.promptCard.myTemplate")),
    imageUrl: item.previewImageUrl,
  }));
  const styleOptions = (presets ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    hint: item.description || undefined,
    imageUrl: item.previewImageUrl,
  }));

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        <NodeField
          value={templateId}
          displayValue={template?.name}
          options={templateOptions}
          onChange={(next) => updateNodeConfig(id, { ...data.config, designTemplateId: next })}
          loading={systemLoading || personalLoading}
          disabled={disabled}
          placeholder={t("workflowEditor.promptCard.chooseTemplate")}
          ariaLabel={t("workflowEditor.fields.prompt-synthesis.designTemplateId.label")}
        />
        <NodeField
          value={styleId}
          displayValue={style?.name}
          options={styleOptions}
          onChange={(next) => updateNodeConfig(id, { ...data.config, stylePresetId: next })}
          noneLabel={t("workflowEditor.fields.prompt-synthesis.stylePresetId.noneLabel")}
          loading={presetsLoading}
          disabled={disabled}
          placeholder={t("workflowEditor.promptCard.noArtStyle")}
          ariaLabel={t("workflowEditor.fields.prompt-synthesis.stylePresetId.label")}
        />
        <NodeTextInput
          value={instructions}
          onChange={(next) => updateNodeConfig(id, { ...data.config, instructions: next })}
          maxLength={500}
          disabled={disabled}
          placeholder={t("workflowEditor.promptCard.addInstructions")}
          ariaLabel={t("workflowEditor.fields.prompt-synthesis.instructions.label")}
          rows={2}
        />
      </div>
    </NodeFrame>
  );
};
