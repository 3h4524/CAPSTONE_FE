"use client";

import { useTranslation } from "react-i18next";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import { getSelectFieldLabel, getSelectFieldOptions, readString } from "@/helpers/workflow-config";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";

type DesignImageFieldsProps = {
  nodeId: string;
  data: WorkflowNode["data"];
  disabled?: boolean;
};

// One design per product, so only the model and the ratio are chosen here; more designs come from Regenerate.
export const DesignImageFields = ({ nodeId, data, disabled = false }: DesignImageFieldsProps) => {
  const { t } = useTranslation("common");
  const model = readString(data.config.imageProvider);
  const ratio = readString(data.config.aspectRatio);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const modelOptions = getSelectFieldOptions(data.type, "imageProvider").map((option) => ({
    ...option,
    description:
      option.description &&
      t(`workflowEditor.fields.${data.type}.imageProvider.options.${option.value}.description`, {
        defaultValue: option.description,
      }),
  }));
  const ratioOptions = getSelectFieldOptions(data.type, "aspectRatio");

  return (
    <>
      <NodeField
        value={model}
        displayValue={getSelectFieldLabel(data.type, "imageProvider", model)}
        options={modelOptions}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, imageProvider: next })}
        disabled={disabled}
        placeholder={t("workflowEditor.nodeCards.chooseImageModel")}
        ariaLabel={t("workflowEditor.fields.design-image.imageProvider.label")}
      />
      <NodeSegmented
        options={ratioOptions}
        value={ratio}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, aspectRatio: next })}
        disabled={disabled}
        ariaLabel={t("workflowEditor.fields.design-image.aspectRatio.label")}
      />
    </>
  );
};
