import { useTranslation } from "react-i18next";

import type { ImageQualityLiveHighlights } from "@/types/admin-image-quality";

type LiveHighlightCardsProps = {
  highlights: ImageQualityLiveHighlights;
};

const LABEL_KEYS: Record<string, string> = {
  "Failed or blocked": "admin.imageQuality.shared.failedOrBlocked",
  "Regenerate requests": "admin.imageQuality.live.highlight.regenerateRequests",
  "Time per image": "admin.imageQuality.live.highlight.timePerImage",
  "Cost per image": "admin.imageQuality.live.highlight.costPerImage",
};

const NOTE_KEYS: Record<string, string> = {
  "Share of attempts that saved no image": "admin.imageQuality.live.highlight.failedOrBlockedNote",
  "Per product that got designs": "admin.imageQuality.live.highlight.regenerateNote",
  "Average, saved images only": "admin.imageQuality.live.highlight.timeNote",
  "Average provider cost": "admin.imageQuality.live.highlight.costNote",
};

export const LiveHighlightCards = ({ highlights }: LiveHighlightCardsProps) => {
  const { t } = useTranslation("common");

  return (
  <div className="flex flex-col gap-3">
    <p className="text-ink-600 text-sm">
      {t("admin.imageQuality.live.highlight.newestVersion")} <span className="text-ink-900 font-semibold">{highlights.current.label}</span>
      {highlights.baseline ? (
        <>
          {t("admin.imageQuality.live.highlight.comparedWith")}{" "}
          <span className="text-ink-900 font-semibold">{highlights.baseline.label}</span>
        </>
      ) : null}
    </p>
    <div className="grid gap-4 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {highlights.cards.map((card) => {
        const labelKey = LABEL_KEYS[card.label];
        const noteKey = NOTE_KEYS[card.note];
        return (
          <article
            key={card.label}
            className="border-ink-200 bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:gap-1.5 max-md:p-3"
          >
            <p className="text-ink-600 text-[13px] font-semibold">{labelKey ? t(labelKey) : card.label}</p>
            <p className="font-display text-ink-900 text-3xl font-bold tracking-tight tabular-nums max-md:text-lg">
              {card.value}
            </p>
            <p className="text-ink-500 text-[13px] max-md:text-[11px]">
              {card.baseline !== null ? (
                <span className="bg-ink-100 text-ink-700 mr-1 rounded px-1.5 py-0.5 font-mono text-xs">
                  {t("admin.imageQuality.live.highlight.wasBaseline", { value: card.baseline })}
                </span>
              ) : null}
              {noteKey ? t(noteKey) : card.note}
            </p>
          </article>
        );
      })}
    </div>
  </div>
  );
};
