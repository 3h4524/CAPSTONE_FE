import { remaining } from "@/helpers/allowance";
import type { AllowanceState } from "@/helpers/seller-dashboard";
import type { AllowanceItem } from "@/types/allowance";
import { cn } from "@/utils/cn";

const STATE_CLASSES: Record<AllowanceState, { bar: string; track: string; figure: string }> = {
  over: { bar: "bg-rose-400", track: "bg-rose-100 dark:bg-rose-500/15", figure: "text-rose-600 dark:text-rose-400" },
  near: { bar: "bg-amber-400", track: "bg-amber-100 dark:bg-amber-500/15", figure: "text-amber-700 dark:text-amber-300" },
  ok: { bar: "bg-[#2fae93]", track: "bg-ink-100", figure: "text-foreground" },
};

type AllowanceMeterProps = {
  item: AllowanceItem;
  state: AllowanceState;
};

/**
 * One allowance as a small fuel gauge: the bar is what is left, so a full bar means plenty and an
 * empty one means used up, with "left / limit" beside the name.
 */
export const AllowanceMeter = ({ item, state }: AllowanceMeterProps) => {
  const left = remaining(item);
  const leftPercent = item.limit > 0 ? (left / item.limit) * 100 : 0;

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground truncate font-medium capitalize">{item.label}</span>
        <span className="shrink-0 tabular-nums">
          <span className={cn("text-xs font-semibold", STATE_CLASSES[state].figure)}>{left}</span>
          <span className="text-muted-foreground">/{item.limit}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${item.label}: ${left} of ${item.limit} left`}
        aria-valuemin={0}
        aria-valuemax={item.limit}
        aria-valuenow={left}
        className={cn("h-1.5 overflow-hidden rounded-full", STATE_CLASSES[state].track)}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            STATE_CLASSES[state].bar
          )}
          style={{ width: `${leftPercent}%` }}
        />
      </div>
    </div>
  );
};
