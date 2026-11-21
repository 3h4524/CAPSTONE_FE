"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { VideoTemplateThumbnail } from "@/components/workflows/config-panel/fields/video-template-thumbnail";
import type { VideoPackDefinition } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

export type VideoTemplateOption = {
  code: string;
  name: string;
  meta: string | null;
  description: string;
  tag: { label: string; ai: boolean } | null;
  pack?: VideoPackDefinition;
};

type VideoTemplateListProps = {
  options: VideoTemplateOption[];
  selectedCode: string;
  /** A template waiting for the seller to confirm it replaces their scenes. */
  pendingCode?: string | null;
  customized?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onChoose: (option: VideoTemplateOption) => void;
};

// The templates listed in the panel itself, in a box of its own height that scrolls, so a long catalog does not
// stretch the Generate Video panel.
export const VideoTemplateList = ({
  options,
  selectedCode,
  pendingCode = null,
  customized = false,
  loading = false,
  disabled = false,
  onChoose,
}: VideoTemplateListProps) => {
  const { t } = useTranslation("common");
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Brings the template in use into view inside the box, without scrolling the panel around it.
  useEffect(() => {
    const list = listRef.current;
    const selected = selectedRef.current;
    if (!list || !selected || loading) return;
    const top = selected.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + selected.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = Math.max(0, top - 8);
  }, [loading, selectedCode]);

  if (loading) {
    return (
      <div className="space-y-1.5 rounded-xl border p-1.5" aria-busy="true" aria-label={t("workflowConfig.aiShot.loadingShort")}>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-start gap-3 rounded-lg p-2.5">
            <span className="bg-muted size-16 shrink-0 animate-pulse rounded-lg" />
            <span className="flex-1 space-y-2 pt-1">
              <span className="bg-muted block h-3 w-1/3 animate-pulse rounded" />
              <span className="bg-muted block h-2.5 w-2/3 animate-pulse rounded" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  // No overscroll-contain: once the list is at its end (or too short to scroll), the wheel goes on to scroll the panel.
  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={t("workflowConfig.aiShot.videoTemplate")}
      className="max-h-80 space-y-1 overflow-y-auto rounded-xl border p-1.5 [scrollbar-width:thin]"
    >
      {options.map((option) => {
        const selected = option.code === selectedCode;
        const pending = option.code === pendingCode;
        return (
          <button
            key={option.code}
            ref={selected ? selectedRef : undefined}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChoose(option)}
            className={cn(
              "focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
              selected
                ? "border-primary/40 bg-primary/5"
                : pending
                  ? "border-amber-400 bg-amber-50/70 dark:bg-amber-950/20"
                  : "hover:bg-muted/60 cursor-pointer border-transparent"
            )}
          >
            <VideoTemplateThumbnail code={option.code} ai={option.tag?.ai ?? false} selected={selected} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold">{option.name}</span>
                {option.meta && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {option.meta}
                    {selected && customized && ` · ${t("workflowConfig.aiShot.customizedSuffix")}`}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs leading-snug">
                {option.description}
              </span>
              {option.tag && (
                <span
                  className={cn(
                    "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                    option.tag.ai ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {option.tag.label}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-ink-300"
              )}
            >
              {selected && <Check className="size-2.5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
};
