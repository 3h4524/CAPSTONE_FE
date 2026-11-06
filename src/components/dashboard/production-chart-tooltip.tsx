import { formatTrendDay, formatUsd } from "@/helpers/seller-dashboard";
import type { TrendPoint } from "@/types/seller-dashboard";

type ProductionChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
};

/** The hovered day of the production chart: what was added, finished, failed and spent. */
export const ProductionChartTooltip = ({ active, payload }: ProductionChartTooltipProps) => {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{formatTrendDay(point.date)}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Added</dt>
        <dd className="text-right font-medium">{point.products}</dd>
        <dt className="text-muted-foreground">Finished</dt>
        <dd className="text-right font-medium">{point.finished}</dd>
        <dt className="text-muted-foreground">Failed</dt>
        <dd className="text-right font-medium">{point.failed}</dd>
        <dt className="text-muted-foreground">AI cost</dt>
        <dd className="text-right font-medium">{formatUsd(point.costUsd)}</dd>
      </dl>
    </div>
  );
};
