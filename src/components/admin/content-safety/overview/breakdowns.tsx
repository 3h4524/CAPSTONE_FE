import {
  CATEGORY_LABELS,
  DECIDERS,
  DECISION_CHART_COLORS,
  featureLabel,
  formatNumber,
} from "@/components/admin/content-safety/shared";
import type {
  ModerationCategoryCount,
  ModerationCount,
  ModerationDecider,
  ModerationFeatureCount,
} from "@/types/admin-moderation";

const Empty = ({ text }: { text: string }) => <p className="text-ink-500 py-6 text-center text-sm">{text}</p>;

const widthOf = (value: number, max: number) => `${max === 0 ? 0 : Math.max(2, (value / max) * 100)}%`;

/** Blocked and flagged checks per category, largest first; each bar is labelled with both numbers. */
export const CategoryBreakdown = ({ items }: { items: ModerationCategoryCount[] }) => {
  if (items.length === 0) return <Empty text="Nothing blocked or flagged in this period." />;
  const max = Math.max(...items.map((item) => item.blocked + item.flagged));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.category} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800 dark:text-ink-100 font-medium">{CATEGORY_LABELS[item.category] ?? item.category}</span>
            <span className="text-ink-500 text-xs tabular-nums">
              {formatNumber(item.blocked)} blocked · {formatNumber(item.flagged)} flagged
            </span>
          </div>
          <div
            className="bg-ink-100 dark:bg-ink-800/60 flex h-2.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`${CATEGORY_LABELS[item.category] ?? item.category}: ${item.blocked} blocked, ${item.flagged} flagged`}
          >
            <span
              className="h-full"
              style={{ width: widthOf(item.blocked, max), backgroundColor: DECISION_CHART_COLORS.block }}
            />
            {item.flagged > 0 && (
              <span
                className="border-card h-full border-l-2"
                style={{ width: widthOf(item.flagged, max), backgroundColor: DECISION_CHART_COLORS.flagged }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Blocks by the layer that made them. One measure, so one neutral color; the label names the layer. */
export const DeciderBreakdown = ({ items }: { items: ModerationCount[] }) => {
  if (items.length === 0) return <Empty text="No blocks in this period." />;
  const max = Math.max(...items.map((item) => item.count));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800 dark:text-ink-100 font-medium">
              {DECIDERS[item.key as ModerationDecider]?.label ?? item.key}
            </span>
            <span className="text-ink-500 text-xs tabular-nums">
              {formatNumber(item.count)} · {Math.round((item.count / total) * 100)}%
            </span>
          </div>
          <div className="bg-ink-100 dark:bg-ink-800/60 h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            <span className="bg-ink-500 dark:bg-ink-400 block h-full rounded-full" style={{ width: widthOf(item.count, max) }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Checks per feature with the blocked share drawn inside each bar. */
export const FeatureBreakdown = ({ items }: { items: ModerationFeatureCount[] }) => {
  if (items.length === 0) return <Empty text="No checks in this period." />;
  const max = Math.max(...items.map((item) => item.checks));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.feature} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800 dark:text-ink-100 font-medium">{featureLabel(item.feature)}</span>
            <span className="text-ink-500 text-xs tabular-nums">
              {formatNumber(item.checks)} checks · {formatNumber(item.blocked)} blocked
            </span>
          </div>
          <div className="bg-ink-100 dark:bg-ink-800/60 h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            <div className="bg-ink-300 dark:bg-ink-600 flex h-full rounded-full" style={{ width: widthOf(item.checks, max) }}>
              {item.blocked > 0 && (
                <span
                  className="h-full rounded-l-full"
                  style={{ width: widthOf(item.blocked, item.checks), backgroundColor: DECISION_CHART_COLORS.block }}
                />
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};
