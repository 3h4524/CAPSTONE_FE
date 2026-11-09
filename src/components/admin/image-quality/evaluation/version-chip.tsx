import { Check } from "lucide-react";

import { IMAGE_EVAL_PHASE_LABELS } from "@/constants/image-quality";
import type { ImageEvalVersion } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type VersionChipProps = {
  version: ImageEvalVersion;
  isSelected: boolean;
  onToggle: () => void;
};

export const VersionChip = ({ version, isSelected, onToggle }: VersionChipProps) => (
  <button
    type="button"
    aria-pressed={isSelected}
    onClick={onToggle}
    className={cn(
      "focus-visible:ring-ring/50 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-[3px] max-md:rounded-2xl",
      isSelected
        ? "text-ink-900 border-sky-700 bg-sky-50 font-medium dark:bg-sky-500/10"
        : "border-ink-200 bg-card text-ink-600 hover:border-ink-400"
    )}
  >
    {isSelected ? <Check className="size-3.5 shrink-0 text-sky-700 dark:text-sky-300" /> : null}
    <span className="truncate max-md:whitespace-normal">{version.label}</span>
    <span className="bg-ink-100 text-ink-600 shrink-0 rounded-full px-1.5 font-mono text-[11px]">
      {version.imageCount}
    </span>
    {version.phase === "trial" ? (
      <span className="text-ink-400 shrink-0 text-[11px] font-normal italic">
        {IMAGE_EVAL_PHASE_LABELS.trial.toLowerCase()}
      </span>
    ) : null}
  </button>
);
