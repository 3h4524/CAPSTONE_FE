"use client";

import { useTranslation } from "react-i18next";

import { ChoiceButtons } from "@/components/workflows/config-panel/fields/choice-buttons";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { productLineRatios } from "@/constants/batches";
import { listWords, productLineName } from "@/helpers/product-lines";
import { parseAspectRatio } from "@/helpers/workflow-config";
import { useWorkflowProductLine } from "@/hooks/use-workflow-product-line";
import type { WorkflowOption } from "@/types/workflow";

type DesignRatioChoicesProps = {
  options: WorkflowOption[];
  value: string;
  label: string;
  onChange: (value: string) => void;
};

// The design's aspect ratio. Any of them can run; a note says when another fits the batch's print area better.
export const DesignRatioChoices = ({ options, value, label, onChange }: DesignRatioChoicesProps) => {
  const { t } = useTranslation("common");
  const line = useWorkflowProductLine();
  const fit = line ? productLineRatios[line] : null;

  return (
    <div className="min-w-0 space-y-1.5">
      <ChoiceButtons
        choices={options.map((option) => ({ ...option, ratio: parseAspectRatio(option.value) }))}
        value={value}
        label={label}
        onChange={onChange}
      />
      {line && fit && (
        <p className="text-muted-foreground text-xs">
          {t("workflowConfig.fields.designRatioWhy", { line: productLineName(line), why: t(`batches.productLineRatioWhy.${line}`) })}
        </p>
      )}
      {line && fit && value && !fit.ratios.includes(value) && (
        <PanelNotice>
          {t("workflowConfig.fields.designRatioMismatch", { ratio: value, line: productLineName(line).toLocaleLowerCase(), ratios: listWords(fit.ratios, "disjunction") })}
        </PanelNotice>
      )}
    </div>
  );
};
