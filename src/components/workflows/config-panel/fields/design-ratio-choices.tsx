"use client";

import { ChoiceButtons } from "@/components/workflows/config-panel/fields/choice-buttons";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { productLineLabels, productLineRatios } from "@/constants/batches";
import { parseAspectRatio } from "@/helpers/workflow-config";
import { ratioOptionsFor, useWorkflowProductLine } from "@/hooks/use-workflow-product-line";
import type { WorkflowOption } from "@/types/workflow";

type DesignRatioChoicesProps = {
  options: WorkflowOption[];
  value: string;
  label: string;
  onChange: (value: string) => void;
};

// The design's aspect ratio, out of the ones that suit the print area of the batch's product line.
export const DesignRatioChoices = ({ options, value, label, onChange }: DesignRatioChoicesProps) => {
  const line = useWorkflowProductLine();
  const shown = ratioOptionsFor(options, line);
  const fit = line ? productLineRatios[line] : null;

  return (
    <div className="min-w-0 space-y-1.5">
      <ChoiceButtons
        choices={shown.map((option) => ({ ...option, ratio: parseAspectRatio(option.value) }))}
        value={value}
        label={label}
        onChange={onChange}
      />
      {line && fit && (
        <p className="text-muted-foreground text-xs">
          {productLineLabels[line]} batch: {fit.why}
        </p>
      )}
      {line && fit && value && !fit.ratios.includes(value) && (
        <PanelNotice tone="warning">
          {value} does not suit a {productLineLabels[line].toLowerCase()} batch. Choose {fit.ratios.join(" or ")}.
        </PanelNotice>
      )}
    </div>
  );
};
