"use client";

import { cn } from "@/utils/cn";

export type PreviewTone = "live" | "done" | "failed";

const TONE_CLASS_NAMES: Record<PreviewTone, string> = {
  live: "text-wf-process before:motion-safe:animate-pulse",
  done: "text-wf-faint",
  failed: "text-wf-fail",
};

type PreviewStatusProps = {
  tone: PreviewTone;
  label: string;
};

export const PreviewStatus = ({ tone, label }: PreviewStatusProps) => (
  <span
    className={cn(
      "ml-auto inline-flex items-center gap-1 text-[9px] font-semibold tracking-wider uppercase before:size-1.5 before:rounded-full before:bg-current before:content-['']",
      TONE_CLASS_NAMES[tone]
    )}
  >
    {label}
  </span>
);
