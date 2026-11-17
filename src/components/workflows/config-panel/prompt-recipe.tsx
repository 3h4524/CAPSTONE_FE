"use client";

import { useTranslation } from "react-i18next";

import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { readString } from "@/helpers/workflow-config";
import { useDesignTemplate } from "@/hooks/queries/use-design-template";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import type { WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";

type PromptRecipeProps = {
  config: WorkflowNodeConfig;
};

// What each design prompt is made from, in the order the server joins it: the template, the product,
// the art style and the person's own instructions.
export const PromptRecipe = ({ config }: PromptRecipeProps) => {
  const { t } = useTranslation("common");
  const templateId = readString(config.designTemplateId);
  const stylePresetId = readString(config.stylePresetId);
  const instructions = readString(config.instructions).trim();
  const { data: template, isPending: isLoadingTemplate } = useDesignTemplate(templateId || null);
  const { data: presets } = useStylePresets();
  const preset = presets?.find((item) => item.id === stylePresetId);

  const parts = [
    {
      key: "template",
      label: t("workflowConfig.promptRecipe.template"),
      text: !templateId ? null : isLoadingTemplate ? t("workflowConfig.promptRecipe.loading") : template?.basePrompt || null,
      empty: templateId ? t("workflowConfig.promptRecipe.noBasePrompt") : t("workflowConfig.promptRecipe.notChosen"),
      note: template?.negativePrompt ? t("workflowConfig.promptRecipe.avoid", { prompt: template.negativePrompt }) : null,
    },
    { key: "product", label: t("workflowConfig.promptRecipe.product"), text: t("workflowConfig.promptRecipe.productText"), empty: "", note: null },
    { key: "style", label: t("workflowConfig.promptRecipe.style"), text: preset?.styleModifiers || null, empty: stylePresetId ? t("workflowConfig.promptRecipe.addsNothing") : t("workflowConfig.promptRecipe.none"), note: null },
    { key: "instructions", label: t("workflowConfig.promptRecipe.instructions"), text: instructions || null, empty: t("workflowConfig.promptRecipe.none"), note: null },
  ];

  return (
    <PanelSection title={t("workflowConfig.promptRecipe.title")} description={t("workflowConfig.promptRecipe.description")}>
      <dl className="bg-ink-50/60 divide-y rounded-md border text-xs">
        {parts.map((part) => (
          <div key={part.key} className="flex gap-3 px-3 py-2.5">
            <dt className="text-muted-foreground w-20 shrink-0">{part.label}</dt>
            <dd className="min-w-0 flex-1 space-y-1">
              <p className={cn("line-clamp-4 leading-relaxed wrap-break-word", part.text ? "text-ink-800" : "text-muted-foreground")}>{part.text ?? part.empty}</p>
              {part.note && <p className="text-muted-foreground line-clamp-2 leading-relaxed">{part.note}</p>}
            </dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
};
