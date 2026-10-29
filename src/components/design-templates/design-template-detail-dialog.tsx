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
        className="max-h-[90dvh] gap-0 overflow-y-auto rounded-[22px] border-slate-200 p-0 duration-200 motion-reduce:animate-none motion-reduce:transition-none sm:max-w-5xl lg:overflow-hidden"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 size-10 rounded-lg text-slate-500 hover:translate-y-0 hover:bg-slate-100"
          onClick={onClose}
          aria-label="Close template details"
        >
          <X aria-hidden="true" />
        </Button>
        {templateQuery.isPending ? (
          <div
            className="min-h-80 animate-pulse bg-slate-100"
            aria-label="Loading template details"
          />
        ) : templateQuery.isError || !template ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <Sparkles className="size-8 text-slate-400" aria-hidden="true" />
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
            <aside className="border-b border-slate-200 bg-[#eef1ed] p-5 sm:p-6 lg:overflow-y-auto lg:border-r lg:border-b-0">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_14px_35px_rgba(39,55,80,0.1)] lg:aspect-[4/5]">
                {template.previewImageUrl && !imageFailed ? (
                  <Image
                    fill
                    sizes="(max-width: 1023px) calc(100vw - 5rem), 34vw"
                    src={template.previewImageUrl}
                    alt={`Preview artwork for ${template.name}`}
                    className="object-contain"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4ead5,transparent_42%),linear-gradient(145deg,#e8ede8,#d8dfdc)] px-6 text-center">
                    <Sparkles className="size-8 text-slate-500" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Preview unavailable</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      This template does not have a preview image yet.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                  Template overview
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-slate-300/70 py-4 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Type</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {template.isSystemTemplate ? "System" : "Personal"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Uses</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {template.usageCount.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Niche</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {template.nicheCategory ?? "General"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Art style</dt>
                    <dd className="mt-1 font-semibold text-slate-900 capitalize">
                      {template.artStyle?.replaceAll("_", " ") ?? "Unstyled"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  Updated{" "}
                  <time dateTime={template.updatedAtUtc}>{formatDate(template.updatedAtUtc)}</time>
                </p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col lg:max-h-[90dvh]">
              <div className="shrink-0 border-b border-slate-200 bg-[#f7f5ef] px-6 py-6 pr-16 sm:px-8 sm:pr-20">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-slate-600 uppercase">
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
                    className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase"
                  >
                    Positive prompt
                  </p>
                  <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-700">
                    {template.basePrompt}
                  </p>
                  {template.negativePrompt && (
                    <>
                      <p className="mt-5 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">
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
                    className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase"
                  >
                    Prompt examples
                  </p>
                  <div className="mt-3 space-y-3">
                    {template.examples.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        No examples have been added.
                      </p>
                    ) : (
                      template.examples.map((example) => (
                        <div
                          key={`${example.subject}-${example.prompt}`}
                          className="rounded-xl bg-[#f3f6f4] p-4"
                        >
                          <p className="text-sm font-semibold text-slate-900">{example.subject}</p>
                          <p className="mt-1 text-xs leading-5 [overflow-wrap:anywhere] text-slate-600">
                            {example.prompt}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
              <DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-4 sm:px-8">
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
