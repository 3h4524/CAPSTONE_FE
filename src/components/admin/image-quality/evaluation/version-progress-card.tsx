import { PHASE_TONES } from "@/components/admin/image-quality/evaluation/version-progress-row";
import { RateMeter } from "@/components/admin/image-quality/rate-meter";
import { IMAGE_EVAL_PHASE_LABELS } from "@/constants/image-quality";
import { formatImageQualityNumber } from "@/helpers/image-quality-format";
import type { ImageEvalVersionStats } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

/** One prompt version on a phone: every column of its table row, stacked. */
export const VersionProgressCard = ({ stats }: { stats: ImageEvalVersionStats }) => {
  const rates = [
    { label: "Text correct", value: stats.textOk },
    { label: "Lettering clear", value: stats.textClear },
    { label: "Layout passes", value: stats.layoutOk },
  ];
  const figures = [
    { label: "Images", value: String(stats.letteredCount) },
    { label: "CLIPScore", value: formatImageQualityNumber(stats.clipOverall, 1) },
    { label: "MUSIQ", value: formatImageQualityNumber(stats.musiq, 1) },
  ];

  return (
    <li className="space-y-2.5 px-4 py-3">
      <p className="text-ink-900 flex flex-wrap items-center gap-2 text-sm font-medium">
        {stats.version.label}
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", PHASE_TONES[stats.version.phase])}>
          {IMAGE_EVAL_PHASE_LABELS[stats.version.phase]}
        </span>
      </p>
      <div className="space-y-2">
        {rates.map((rate) => (
          <div key={rate.label}>
            <p className="text-ink-500 mb-1 text-[11px]">{rate.label}</p>
            <RateMeter value={rate.value} />
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt className="text-ink-500 text-[11px]">{figure.label}</dt>
            <dd className="text-ink-800 mt-0.5 font-mono text-sm">{figure.value}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
};
