"use client";

import { BatchSelect } from "@/components/workflows/config-panel/fields/batch-select";
import { DesignTemplateSelect } from "@/components/workflows/config-panel/fields/design-template-select";
import { StylePresetSelect } from "@/components/workflows/config-panel/fields/style-preset-select";
import type { WorkflowOptionSource } from "@/types/workflow";

type SourceSelectProps = {
  source: WorkflowOptionSource;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const SourceSelect = ({ source, label, value, onChange }: SourceSelectProps) => {
  const placeholder = `Choose ${label.toLowerCase()}`;

  switch (source) {
    case "batches":
      return <BatchSelect value={value} placeholder={placeholder} onChange={onChange} />;
    case "design-templates":
      return <DesignTemplateSelect value={value} placeholder={placeholder} onChange={onChange} />;
    case "style-presets":
      return <StylePresetSelect value={value} placeholder={placeholder} onChange={onChange} />;
  }
};
