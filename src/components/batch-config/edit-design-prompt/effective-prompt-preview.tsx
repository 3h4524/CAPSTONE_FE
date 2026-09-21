"use client";

import { MAX_EFFECTIVE_PROMPT_LENGTH } from "@/schemas/product-prompt";
import { cn } from "@/utils/cn";

type EffectivePromptPreviewProps = {
  prompt: string;
};

export const EffectivePromptPreview = ({ prompt }: EffectivePromptPreviewProps) => {
  const overLimit = prompt.length > MAX_EFFECTIVE_PROMPT_LENGTH;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Effective prompt preview</p>
        <p className={cn("text-xs font-medium tabular-nums", overLimit ? "text-red-600" : "text-muted-foreground")} aria-live="polite">
          {prompt.length} / {MAX_EFFECTIVE_PROMPT_LENGTH}
        </p>
      </div>
      <div className={cn("rounded-xl bg-slate-50 p-4 text-sm whitespace-pre-wrap", overLimit && "ring-1 ring-red-500 ring-inset")}>
        {prompt.length > 0 ? prompt : "Start typing to see the combined prompt."}
      </div>
      {overLimit && (
        <p role="alert" className="text-sm text-red-600">The effective prompt must not exceed 1000 characters.</p>
      )}
    </div>
  );
};
