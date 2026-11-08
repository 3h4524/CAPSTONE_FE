"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, Copy, Eye, Pencil, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DesignTemplateSummary } from "@/types/design-template";
import { cn } from "@/utils/cn";

type DesignTemplateCardProps = {
  template: DesignTemplateSummary;
  cloning: boolean;
  onView: (id: string) => void;
  onClone: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (template: DesignTemplateSummary) => void;
};

export function DesignTemplateCard({
  template,
  cloning,
  onView,
  onClone,
  onEdit,
  onDelete,
}: DesignTemplateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const styleLabel = template.artStyle?.replaceAll("_", " ") ?? "Unstyled";

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-[18px] border border-ink-200 bg-card shadow-[0_1px_2px_rgba(39,55,80,0.04)] transition-[box-shadow,border-color] duration-300 ease-out hover:border-ink-300 hover:shadow-[0_14px_34px_rgba(39,55,80,0.09)] motion-reduce:transition-none">
      <button
        type="button"
        className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100 text-left focus-visible:ring-3 focus-visible:ring-primary/25 focus-visible:outline-none focus-visible:ring-inset max-md:aspect-video"
        onClick={() => onView(template.id)}
        aria-label={`View ${template.name}`}
      >
        {template.previewImageUrl && !imageFailed ? (
          <Image
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            src={template.previewImageUrl}
            alt={`Preview artwork for ${template.name}`}
            className="transform-gpu object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.012] motion-reduce:transform-none motion-reduce:transition-none"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f4ead5,transparent_42%),linear-gradient(145deg,#e8ede8,#d8dfdc)]">
            <Sparkles className="size-8 text-ink-500" aria-hidden="true" />
          </span>
        )}
        <span
          className={cn(
            "absolute top-3 left-3 rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase backdrop-blur-md",
            template.isSystemTemplate
              ? "border-white/50 bg-[#18221f]/80 text-white"
              : "border-primary/15 bg-card/90 text-primary"
          )}
        >
          {template.isSystemTemplate ? "System" : "Personal"}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-5 max-md:p-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.04em] text-ink-500">
          <span>{template.nicheCategory ?? "General"}</span>
          <span className="size-1 rounded-full bg-ink-300" aria-hidden="true" />
          <span className="capitalize">{styleLabel}</span>
        </div>
        <h2 className="font-display mt-4 text-xl font-semibold tracking-tight text-ink-900 max-md:mt-2 max-md:text-lg">
          {template.name}
        </h2>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-ink-600 max-md:mt-1 max-md:min-h-0">
          {template.styleDescription ?? "A personal prompt framework ready for your next collection."}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500 max-md:mt-3 max-md:pt-3">
          <span className={cn(template.usageCount === 0 && "max-md:invisible")}>{template.usageCount.toLocaleString()} uses</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <time dateTime={template.updatedAtUtc}>{formatDate(template.updatedAtUtc)}</time>
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 max-md:mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 flex-1 border-ink-300 px-3 hover:translate-y-0"
            onClick={() => onView(template.id)}
          >
            <Eye aria-hidden="true" />View
          </Button>
          {template.canClone && (
            <Button
              type="button"
              size="sm"
              className="min-h-9 flex-[1.5] px-3 hover:translate-y-0"
              disabled={cloning}
              onClick={() => onClone(template.id)}
            >
              <Copy aria-hidden="true" />{cloning ? "Cloning..." : "Clone & customize"}
            </Button>
          )}
          {template.canEdit && (
            <Button
              type="button"
              size="sm"
              className="min-h-9 flex-1 px-3 hover:translate-y-0"
              onClick={() => onEdit(template.id)}
            >
              <Pencil aria-hidden="true" />Edit
            </Button>
          )}
          {template.canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-h-9 text-ink-500 hover:translate-y-0 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
              onClick={() => onDelete(template)}
              aria-label={`Delete ${template.name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value)
  );
}
