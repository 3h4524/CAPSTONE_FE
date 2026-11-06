import { OUTLOOK_CHIP, OUTLOOK_ICON, STATUS_STYLE } from "@/components/admin/subscription-plans/plan-health-parts";
import { OUTLOOK_LABEL, STATUS_LABEL } from "@/helpers/plan-ai-review";
import type { PlanAiAssessment, PlanAiScore } from "@/types/plan-ai-review";
import { cn } from "@/utils/cn";

/** Points a score must move since the last review before the change is shown. */
export const SCORE_CHANGE_SHOWN = 5;

/** One paid plan to pick in Plan health: its score as a ring, status, outlook and change since the last review. */
export function PlanTile({
  plan,
  name,
  previous,
  selected,
  onSelect,
}: {
  plan: PlanAiAssessment;
  name: string;
  previous?: PlanAiScore;
  selected: boolean;
  onSelect: () => void;
}) {
  const style = STATUS_STYLE[plan.status];
  const Outlook = OUTLOOK_ICON[plan.outlook.direction];
  const delta = previous?.score != null && plan.score != null ? plan.score - previous.score : null;
  // The model's score drifts a few points between runs on the same figures; only a real move is shown.
  const showDelta = delta !== null && Math.abs(delta) >= SCORE_CHANGE_SHOWN;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-white p-4 pt-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected ? cn("shadow-md ring-2", style.selected, style.ring) : "border-slate-200 shadow-xs"
      )}
    >
      {/* A stripe in the plan's status colour, so health reads before the tile is read. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: style.stroke }} />
      <ScoreRing score={plan.score} stroke={style.stroke} className={style.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-bold tracking-tight text-slate-900">{name}</p>
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              OUTLOOK_CHIP[plan.outlook.direction]
            )}
          >
            <Outlook className="size-3.5" /> {OUTLOOK_LABEL[plan.outlook.direction]}
          </span>
        </div>
        <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", style.chip)}>
          {STATUS_LABEL[plan.status]}
        </span>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>{previous ? `Last review: ${STATUS_LABEL[previous.status]} · ${previous.score ?? "—"}` : "First review"}</span>
          {showDelta && delta !== null && (
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                delta > 0 ? "bg-[#2a9d8f]/12 text-[#21796e]" : "bg-[#e76e50]/12 text-[#c4553a]"
              )}
            >
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// The score out of 100 as a ring in the plan's status colour.
function ScoreRing({ score, stroke, className }: { score: number | null; stroke: string; className: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const filled = score === null ? 0 : (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative size-[72px] shrink-0">
      <svg viewBox="0 0 60 60" className="size-full -rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span className={cn("absolute inset-0 flex flex-col items-center justify-center text-2xl leading-none font-bold tabular-nums", className)}>
        {score ?? "—"}
      </span>
    </div>
  );
}
