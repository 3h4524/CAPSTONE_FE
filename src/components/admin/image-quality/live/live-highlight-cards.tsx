import type { ImageQualityLiveHighlights } from "@/types/admin-image-quality";

type LiveHighlightCardsProps = {
  highlights: ImageQualityLiveHighlights;
};

export const LiveHighlightCards = ({ highlights }: LiveHighlightCardsProps) => (
  <div className="flex flex-col gap-3">
    <p className="text-ink-600 text-sm">
      Newest version <span className="text-ink-900 font-semibold">{highlights.current.label}</span>
      {highlights.baseline ? (
        <>
          , compared with{" "}
          <span className="text-ink-900 font-semibold">{highlights.baseline.label}</span>
        </>
      ) : null}
    </p>
    <div className="grid gap-4 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {highlights.cards.map((card) => (
        <article
          key={card.label}
          className="border-ink-200 bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] max-md:gap-1.5 max-md:p-3"
        >
          <p className="text-ink-600 text-[13px] font-semibold">{card.label}</p>
          <p className="font-display text-ink-900 text-3xl font-bold tracking-tight tabular-nums max-md:text-lg">
            {card.value}
          </p>
          <p className="text-ink-500 text-[13px] max-md:text-[11px]">
            {card.baseline !== null ? (
              <span className="bg-ink-100 text-ink-700 mr-1 rounded px-1.5 py-0.5 font-mono text-xs">
                was {card.baseline}
              </span>
            ) : null}
            {card.note}
          </p>
        </article>
      ))}
    </div>
  </div>
);
