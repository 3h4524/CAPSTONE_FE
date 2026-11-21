"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, Copy, Pencil, RefreshCw, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDesignTemplate } from "@/hooks/queries/use-design-template";

type DesignTemplateDetailDialogProps = {
  templateId: string | null;
  cloning: boolean;
  onClose: () => void;
  onClone: (id: string) => void;
  onEdit: (id: string) => void;
};

const NICHE_KEYS: Record<string, string> = {
  "Nature & Botanical": "natureBotanical",
  Outdoors: "outdoors",
  "Food & Drink": "foodDrink",
  Vehicles: "vehicles",
  "Quotes & Motivation": "quotesMotivation",
  "Humor & Lifestyle": "humorLifestyle",
  "Gifts & Occasions": "giftsOccasions",
  "Pets & Animals": "petsAnimals",
  "Sports & Fitness": "sportsFitness",
  "Travel & Places": "travelPlaces",
};

const ART_STYLE_KEYS: Record<string, string> = {
  vintage: "vintage",
  minimalist: "minimalist",
  watercolor: "watercolor",
  bold_typography: "boldTypography",
  dark_academia: "darkAcademia",
  funny_quote: "funnyQuote",
  floral: "floral",
};

export function DesignTemplateDetailDialog({
  templateId,
  cloning,
  onClose,
  onClone,
  onEdit,
}: DesignTemplateDetailDialogProps) {
  const { t, i18n } = useTranslation("common");
  const [imageFailed, setImageFailed] = useState(false);
  const templateQuery = useDesignTemplate(templateId, Boolean(templateId));
  const template = templateQuery.data;
  const nicheKey = template?.nicheCategory ? NICHE_KEYS[template.nicheCategory] : undefined;
  const nicheLabel = template?.nicheCategory
    ? nicheKey
      ? t(`designTemplates.niches.${nicheKey}`, { defaultValue: template.nicheCategory })
      : template.nicheCategory
    : t("designTemplates.general");
  const artStyleKey = template?.artStyle ? ART_STYLE_KEYS[template.artStyle] : undefined;
  const artStyleLabel = template?.artStyle
    ? artStyleKey
      ? t(`designTemplates.artStyles.${artStyleKey}`, {
          defaultValue: template.artStyle.replaceAll("_", " "),
        })
      : template.artStyle.replaceAll("_", " ")
    : t("designTemplates.unstyled");

  useEffect(() => {
    setImageFailed(false);
  }, [templateId]);

  return (
    <Dialog open={Boolean(templateId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="border-ink-200 max-h-[90dvh] gap-0 overflow-y-auto rounded-[22px] p-0 duration-200 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-5xl lg:overflow-hidden"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 z-10 size-10 rounded-lg hover:translate-y-0"
          onClick={onClose}
          aria-label={t("designTemplates.closeDetails")}
        >
          <X aria-hidden="true" />
        </Button>
        {templateQuery.isPending ? (
          <div
            className="bg-ink-100 min-h-80 animate-pulse"
            aria-label={t("designTemplates.loadingDetails")}
          />
        ) : templateQuery.isError || !template ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <Sparkles className="text-ink-400 size-8" aria-hidden="true" />
            <DialogTitle className="mt-4">{t("designTemplates.detailErrorTitle")}</DialogTitle>
            <DialogDescription className="mt-2">
              {t("designTemplates.detailErrorDescription")}
            </DialogDescription>
            <Button
              variant="outline"
              className="mt-5 min-w-36"
              disabled={templateQuery.isFetching}
              aria-busy={templateQuery.isFetching}
              onClick={() => void templateQuery.refetch()}
            >
              <RefreshCw
                className={templateQuery.isFetching ? "size-4 animate-spin" : "size-4"}
                aria-hidden="true"
              />
              <span aria-live="polite">{templateQuery.isFetching ? t("designTemplates.retrying") : t("designTemplates.retry")}</span>
            </Button>
          </div>
        ) : (
          <div className="grid lg:max-h-[90dvh] lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.45fr)]">
            <aside className="border-ink-200 bg-ink-100 border-b p-5 sm:p-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
              <div className="bg-card relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/80 shadow-[0_14px_35px_rgba(39,55,80,0.1)] lg:aspect-[4/5]">
                {template.previewImageUrl && !imageFailed ? (
                  <Image
                    fill
                    sizes="(max-width: 1023px) calc(100vw - 5rem), 34vw"
                    src={template.previewImageUrl}
                    unoptimized
                    alt={t("designTemplates.previewAlt", { name: template.name })}
                    className="object-contain"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4ead5,transparent_42%),linear-gradient(145deg,#e8ede8,#d8dfdc)] px-6 text-center">
                    <Sparkles className="text-ink-500 size-8" aria-hidden="true" />
                    <p className="text-ink-700 mt-3 text-sm font-semibold">{t("designTemplates.previewUnavailable")}</p>
                    <p className="text-ink-500 mt-1 text-xs leading-5">
                      {t("designTemplates.previewUnavailableDescription")}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="text-ink-500 text-[11px] font-bold tracking-[0.12em] uppercase">
                  {t("designTemplates.overview")}
                </p>
                <dl className="border-ink-300/70 mt-3 grid grid-cols-2 gap-x-4 gap-y-4 border-y py-4 text-sm">
                  <div>
                    <dt className="text-ink-500 text-xs">{t("designTemplates.type")}</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {template.isSystemTemplate ? t("designTemplates.system") : t("designTemplates.personal")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">{t("designTemplates.uses")}</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {template.usageCount.toLocaleString(i18n.language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">{t("designTemplates.niche")}</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {nicheLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">{t("designTemplates.artStyle")}</dt>
                    <dd className="text-ink-900 mt-1 font-semibold capitalize">
                      {artStyleLabel}
                    </dd>
                  </div>
                </dl>
                <p className="text-ink-500 mt-4 flex items-center gap-2 text-xs">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  {t("designTemplates.updated")}{" "}
                  <time dateTime={template.updatedAtUtc}>{formatDate(template.updatedAtUtc, i18n.language)}</time>
                </p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col lg:max-h-[90dvh]">
              <div className="border-ink-200 bg-ink-100 shrink-0 border-b px-6 py-6 pr-16 sm:px-8 sm:pr-20">
                <DialogHeader>
                  <div className="text-ink-600 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase">
                    <span>
                      {template.isSystemTemplate ? t("designTemplates.systemTemplate") : t("designTemplates.personalTemplate")}
                    </span>
                    <span aria-hidden="true">/</span>
                    <span>{artStyleLabel}</span>
                  </div>
                  <DialogTitle className="font-display text-2xl tracking-tight sm:text-3xl">
                    {template.name}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl leading-6">
                    {template.styleDescription ?? t("designTemplates.detailFallbackDescription")}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="grid min-h-0 gap-6 px-6 py-6 sm:px-8 lg:flex-1 lg:overflow-y-auto xl:grid-cols-[1fr_0.7fr]">
                <section aria-labelledby="positive-prompt-title">
                  <p
                    id="positive-prompt-title"
                    className="text-ink-500 text-xs font-bold tracking-[0.12em] uppercase"
                  >
                    {t("designTemplates.positivePrompt")}
                  </p>
                  <p className="text-ink-500 mt-1 text-[11px] leading-4">
                    {t("designTemplates.promptLanguageNote")}
                  </p>
                  <p className="border-ink-200 bg-card text-ink-700 mt-3 rounded-xl border p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {template.basePrompt}
                  </p>
                  {template.negativePrompt && (
                    <>
                      <p className="text-ink-500 mt-5 text-xs font-bold tracking-[0.12em] uppercase">
                        {t("designTemplates.negativePrompt")}
                      </p>
                      <p className="border-ink-200 bg-card text-ink-700 mt-3 rounded-xl border p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                        {template.negativePrompt}
                      </p>
                    </>
                  )}
                </section>
                <section aria-labelledby="examples-title">
                  <p
                    id="examples-title"
                    className="text-ink-500 text-xs font-bold tracking-[0.12em] uppercase"
                  >
                    {t("designTemplates.promptExamples")}
                  </p>
                  <div className="mt-3 space-y-3">
                    {template.examples.length === 0 ? (
                      <p className="border-ink-300 text-ink-500 rounded-xl border border-dashed p-4 text-sm">
                        {t("designTemplates.noExamples")}
                      </p>
                    ) : (
                      template.examples.map((example) => (
                        <div
                          key={`${example.subject}-${example.prompt}`}
                          className="bg-ink-100 rounded-xl p-4"
                        >
                          <p className="text-ink-900 text-sm font-semibold">{example.subject}</p>
                          <p className="text-ink-600 mt-1 text-xs leading-5 [overflow-wrap:anywhere]">
                            {example.prompt}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
              <DialogFooter className="border-ink-200 shrink-0 border-t px-6 py-4 sm:px-8">
                <Button type="button" variant="outline" onClick={onClose}>
                  {t("designTemplates.close")}
                </Button>
                {template.canEdit && (
                  <Button type="button" onClick={() => onEdit(template.id)}>
                    <Pencil aria-hidden="true" />
                    {t("designTemplates.editTemplate")}
                  </Button>
                )}
                {template.canClone && (
                  <Button type="button" disabled={cloning} onClick={() => onClone(template.id)}>
                    <Copy aria-hidden="true" />
                    {cloning ? t("designTemplates.cloning") : t("designTemplates.cloneCustomize")}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}
