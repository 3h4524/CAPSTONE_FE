import type { ImageQualityLiveHighlights } from "@/types/admin-image-quality";

type LiveHighlightCardsProps = {
  highlights: ImageQualityLiveHighlights;
};

export const LiveHighlightCards = ({ highlights }: LiveHighlightCardsProps) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-slate-600">
      Newest version <span className="font-semibold text-slate-900">{highlights.current.label}</span>
      {highlights.baseline ? (
        <>
          , compared with{" "}
          <span className="font-semibold text-slate-900">{highlights.baseline.label}</span>
        </>
      ) : null}
    </p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {highlights.cards.map((card) => (
        <article
          key={card.label}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
        >
          <p className="text-[13px] font-semibold text-slate-600">{card.label}</p>
          <p className="font-display text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {card.value}
          </p>
          <p className="text-[13px] text-slate-500">
            {card.baseline !== null ? (
              <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
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
