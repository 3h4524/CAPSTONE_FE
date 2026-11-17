"use client";

import { Check, ClipboardCopy, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/helpers/toast";
import type { AiPromptTrace } from "@/types/video-workflow";

type PromptReview = { sceneOrder: number; trace: AiPromptTrace };

export function AiPromptReviewDialog({
  open,
  prompts,
  isContinuing = false,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  prompts: PromptReview[];
  isContinuing?: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation("common");
  const copyPrompt = async (prompt: string, sceneOrder: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      showToast("success", t("workflowMedia.promptReview.copied", { scene: sceneOrder + 1 }));
    } catch {
      showToast("error", t("workflowMedia.promptReview.copyFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" showCloseButton={!isContinuing}>
        <DialogHeader>
          <DialogTitle>{t("workflowMedia.promptReview.title")}</DialogTitle>
          <DialogDescription>
            {t("workflowMedia.promptReview.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {prompts.map(({ sceneOrder, trace }) => (
            <section key={sceneOrder} className="space-y-3 rounded-lg border p-3" aria-labelledby={`ai-prompt-scene-${sceneOrder}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 id={`ai-prompt-scene-${sceneOrder}`} className="text-sm font-semibold">{t("workflowMedia.sceneCard.sceneTitle", { scene: sceneOrder + 1 })}</h3>
                  <p className="text-muted-foreground text-xs">
                    {trace.ruleVersion == null ? t("workflowMedia.promptReview.templateControls") : t("workflowMedia.promptReview.promptRules", { version: trace.ruleVersion })} · RAG: {trace.ragStatus}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => void copyPrompt(trace.finalPrompt, sceneOrder)}>
                  <ClipboardCopy aria-hidden="true" /> {t("workflowMedia.promptReview.copyFinalPrompt")}
                </Button>
              </div>

              {trace.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300" role="note">
                  {trace.warnings.join(" ")}
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-medium">{t("workflowMedia.promptReview.exactPrompt")}</p>
                <pre className="max-h-52 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-100" aria-label={t("workflowMedia.promptReview.finalPromptLabel", { scene: sceneOrder + 1 })}>
                  {trace.finalPrompt}
                </pre>
              </div>

              <Accordion type="multiple" className="rounded-md border px-3">
                {trace.parts.map((part) => (
                  <AccordionItem key={part.key} value={part.key}>
                    <AccordionTrigger>
                      <span className="flex min-w-0 items-center gap-2">
                        <span>{part.label}</span>
                        <span className={part.includedInFinalPrompt ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}>
                          {part.includedInFinalPrompt ? t("workflowMedia.promptReview.included") : t("workflowMedia.promptReview.notSent")}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted max-h-40 overflow-auto rounded-md p-2 text-xs leading-relaxed whitespace-pre-wrap">{part.content}</pre>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={isContinuing} onClick={() => onOpenChange(false)}>{t("workflowMedia.promptReview.closeAndTest")}</Button>
          <Button type="button" disabled={isContinuing} onClick={onContinue}>
            {isContinuing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {t("workflowMedia.promptReview.continuePaid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
