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
      "focus-visible:ring-ring/50 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-[3px]",
      isSelected
        ? "border-sky-700 bg-sky-50 font-medium text-slate-900"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
    )}
  >
    {isSelected ? <Check className="size-3.5 shrink-0 text-sky-700" /> : null}
    <span className="truncate">{version.label}</span>
    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 font-mono text-[11px] text-slate-600">
      {version.imageCount}
    </span>
    {version.phase === "trial" ? (
      <span className="shrink-0 text-[11px] font-normal text-slate-400 italic">
        {IMAGE_EVAL_PHASE_LABELS.trial.toLowerCase()}
      </span>
    ) : null}
  </button>
);
