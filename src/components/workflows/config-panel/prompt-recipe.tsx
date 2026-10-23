"use client";

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
  const templateId = readString(config.designTemplateId);
  const stylePresetId = readString(config.stylePresetId);
  const instructions = readString(config.instructions).trim();
  const { data: template, isPending: isLoadingTemplate } = useDesignTemplate(templateId || null);
  const { data: presets } = useStylePresets();
  const preset = presets?.find((item) => item.id === stylePresetId);

  const parts = [
    {
      label: "Template",
      text: !templateId ? null : isLoadingTemplate ? "Loading…" : template?.basePrompt || null,
      empty: templateId ? "No base prompt" : "Not chosen",
      note: template?.negativePrompt ? `Avoid: ${template.negativePrompt}` : null,
    },
    { label: "Product", text: "Name, niche and keywords of each product", empty: "", note: null },
    { label: "Style", text: preset?.styleModifiers || null, empty: stylePresetId ? "Adds nothing" : "None", note: null },
    { label: "Instructions", text: instructions || null, empty: "None", note: null },
  ];

  return (
    <PanelSection title="Prompt preview" description="Each product's prompt is built from these parts.">
      <dl className="divide-y rounded-md border bg-slate-50/60 text-xs">
        {parts.map((part) => (
          <div key={part.label} className="flex gap-3 px-3 py-2.5">
            <dt className="text-muted-foreground w-20 shrink-0">{part.label}</dt>
            <dd className="min-w-0 flex-1 space-y-1">
              <p className={cn("line-clamp-4 leading-relaxed wrap-break-word", part.text ? "text-slate-800" : "text-muted-foreground")}>{part.text ?? part.empty}</p>
              {part.note && <p className="text-muted-foreground line-clamp-2 leading-relaxed">{part.note}</p>}
            </dd>
          </div>
        ))}
      </dl>
    </PanelSection>
  );
};
