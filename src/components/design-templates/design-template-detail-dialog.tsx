"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, Copy, Pencil, RefreshCw, Sparkles, X } from "lucide-react";

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

export function DesignTemplateDetailDialog({
  templateId,
  cloning,
  onClose,
  onClone,
  onEdit,
}: DesignTemplateDetailDialogProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const templateQuery = useDesignTemplate(templateId, Boolean(templateId));
  const template = templateQuery.data;

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
          aria-label="Close template details"
        >
          <X aria-hidden="true" />
        </Button>
        {templateQuery.isPending ? (
          <div
            className="bg-ink-100 min-h-80 animate-pulse"
            aria-label="Loading template details"
          />
        ) : templateQuery.isError || !template ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <Sparkles className="text-ink-400 size-8" aria-hidden="true" />
            <DialogTitle className="mt-4">Template could not be loaded</DialogTitle>
            <DialogDescription className="mt-2">
              Refresh the detail view and try again.
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
              <span aria-live="polite">{templateQuery.isFetching ? "Retrying..." : "Retry"}</span>
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
                    alt={`Preview artwork for ${template.name}`}
                    className="object-contain"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4ead5,transparent_42%),linear-gradient(145deg,#e8ede8,#d8dfdc)] px-6 text-center">
                    <Sparkles className="text-ink-500 size-8" aria-hidden="true" />
                    <p className="text-ink-700 mt-3 text-sm font-semibold">Preview unavailable</p>
                    <p className="text-ink-500 mt-1 text-xs leading-5">
                      This template does not have a preview image yet.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="text-ink-500 text-[11px] font-bold tracking-[0.12em] uppercase">
                  Template overview
                </p>
                <dl className="border-ink-300/70 mt-3 grid grid-cols-2 gap-x-4 gap-y-4 border-y py-4 text-sm">
                  <div>
                    <dt className="text-ink-500 text-xs">Type</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {template.isSystemTemplate ? "System" : "Personal"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">Uses</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {template.usageCount.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">Niche</dt>
                    <dd className="text-ink-900 mt-1 font-semibold">
                      {template.nicheCategory ?? "General"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">Art style</dt>
                    <dd className="text-ink-900 mt-1 font-semibold capitalize">
                      {template.artStyle?.replaceAll("_", " ") ?? "Unstyled"}
                    </dd>
                  </div>
                </dl>
                <p className="text-ink-500 mt-4 flex items-center gap-2 text-xs">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  Updated{" "}
                  <time dateTime={template.updatedAtUtc}>{formatDate(template.updatedAtUtc)}</time>
                </p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col lg:max-h-[90dvh]">
              <div className="border-ink-200 bg-ink-100 shrink-0 border-b px-6 py-6 pr-16 sm:px-8 sm:pr-20">
                <DialogHeader>
                  <div className="text-ink-600 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase">
                    <span>
                      {template.isSystemTemplate ? "System template" : "Personal template"}
                    </span>
                    <span aria-hidden="true">/</span>
                    <span>{template.artStyle?.replaceAll("_", " ") ?? "Unstyled"}</span>
                  </div>
                  <DialogTitle className="font-display text-2xl tracking-tight sm:text-3xl">
                    {template.name}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl leading-6">
                    {template.styleDescription ?? "A reusable prompt framework for your catalog."}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="grid min-h-0 gap-6 px-6 py-6 sm:px-8 lg:flex-1 lg:overflow-y-auto xl:grid-cols-[1fr_0.7fr]">
                <section aria-labelledby="positive-prompt-title">
                  <p
                    id="positive-prompt-title"
                    className="text-ink-500 text-xs font-bold tracking-[0.12em] uppercase"
                  >
                    Positive prompt
                  </p>
                  <p className="border-ink-200 bg-card text-ink-700 mt-3 rounded-xl border p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {template.basePrompt}
                  </p>
                  {template.negativePrompt && (
                    <>
                      <p className="text-ink-500 mt-5 text-xs font-bold tracking-[0.12em] uppercase">
                        Negative prompt
                      </p>
                      <p className="mt-3 rounded-xl bg-slate-900 p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-200">
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
                    Prompt examples
                  </p>
                  <div className="mt-3 space-y-3">
                    {template.examples.length === 0 ? (
                      <p className="border-ink-300 text-ink-500 rounded-xl border border-dashed p-4 text-sm">
                        No examples have been added.
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
                  Close
                </Button>
                {template.canEdit && (
                  <Button type="button" onClick={() => onEdit(template.id)}>
                    <Pencil aria-hidden="true" />
                    Edit template
                  </Button>
                )}
                {template.canClone && (
                  <Button type="button" disabled={cloning} onClick={() => onClone(template.id)}>
                    <Copy aria-hidden="true" />
                    {cloning ? "Cloning..." : "Clone & customize"}
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}
