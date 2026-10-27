"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { readInstructionsPreview, readString } from "@/helpers/workflow-config";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const TEMPLATE_PAGE_SIZE = 48;

export const PromptCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const templateId = readString(data.config.designTemplateId);
  const styleId = readString(data.config.stylePresetId);
  const { data: systemTemplates } = useDesignTemplates(
    { pageNumber: 1, pageSize: TEMPLATE_PAGE_SIZE, scope: "system" },
    Boolean(templateId)
  );
  const { data: personalTemplates } = useDesignTemplates(
    { pageNumber: 1, pageSize: TEMPLATE_PAGE_SIZE, scope: "personal" },
    Boolean(templateId)
  );
  const { data: presets } = useStylePresets(Boolean(styleId));
  const template = [...(personalTemplates?.items ?? []), ...(systemTemplates?.items ?? [])].find(
    (item) => item.id === templateId
  );
  const style = presets?.find((item) => item.id === styleId);
  const instructions = readInstructionsPreview(data.config);

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        <NodeField value={template?.name} placeholder="Choose design template" chevron />
        <NodeField value={style?.name} placeholder="No art style" chevron />
        <NodeReadonlyText value={instructions} placeholder="Add extra instructions…" />
      </div>
    </NodeFrame>
  );
};
