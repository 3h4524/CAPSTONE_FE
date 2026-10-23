import type { PanelStat, PanelStatTone } from "@/helpers/workflow-panel";
import { cn } from "@/utils/cn";

const VALUE_TONES: Record<PanelStatTone, string> = {
  default: "text-slate-900",
  warning: "text-amber-700",
  muted: "text-muted-foreground",
};

// The step's key numbers in one row under the header, read before the settings.
export const PanelStats = ({ stats }: { stats: PanelStat[] }) => {
  if (stats.length === 0) return null;

  return (
    <dl
      aria-label="Summary"
      className="grid divide-x border-b"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 px-4 py-3 first:pl-5 last:pr-5">
          <dt className="text-muted-foreground truncate text-xs">{stat.label}</dt>
          <dd className={cn("truncate text-sm font-medium tabular-nums", VALUE_TONES[stat.tone ?? "default"])} title={stat.value}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
