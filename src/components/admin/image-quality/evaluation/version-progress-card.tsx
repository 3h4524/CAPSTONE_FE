import { useTranslation } from "react-i18next";

import { PHASE_KEYS, PHASE_TONES } from "@/components/admin/image-quality/evaluation/version-progress-row";
import { RateMeter } from "@/components/admin/image-quality/rate-meter";
import { formatImageQualityNumber } from "@/helpers/image-quality-format";
import type { ImageEvalVersionStats } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

/** One prompt version on a phone: every column of its table row, stacked. */
export const VersionProgressCard = ({ stats }: { stats: ImageEvalVersionStats }) => {
  const { t } = useTranslation("common");
  const rates = [
    { label: t("admin.imageQuality.shared.textCorrect"), value: stats.textOk },
    { label: t("admin.imageQuality.evaluation.letteringClear"), value: stats.textClear },
    { label: t("admin.imageQuality.evaluation.layoutPasses"), value: stats.layoutOk },
  ];
  const figures = [
    { label: t("admin.imageQuality.shared.images"), value: String(stats.letteredCount) },
    { label: t("admin.imageQuality.shared.clipScore"), value: formatImageQualityNumber(stats.clipOverall, 1) },
    { label: t("admin.imageQuality.shared.musiq"), value: formatImageQualityNumber(stats.musiq, 1) },
  ];

  return (
    <li className="space-y-2.5 px-4 py-3">
      <p className="text-ink-900 flex flex-wrap items-center gap-2 text-sm font-medium">
        {stats.version.label}
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", PHASE_TONES[stats.version.phase])}>
          {t(PHASE_KEYS[stats.version.phase])}
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
