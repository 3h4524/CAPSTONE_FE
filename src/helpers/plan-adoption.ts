/** The Feature adoption table's rules, kept pure so they can be tested on their own. */

/** Below this many Sellers a plan's shares are a small sample. */
export const SMALL_SAMPLE_SELLERS = 30;

/** Only a drop from the plan before of at least this many percentage points is shown. */
export const MIN_DROP_POINTS = 5;

/** The workflow order: design, mockups, listing, video, export. */
export const FEATURE_ORDER = [
  "design_images",
  "mockups",
  "uploaded_mockups",
  "lifestyle_mockups",
  "listings",
  "standard_videos",
  "ai_videos",
  "studio_keyframes",
  "exports",
];

const round1 = (value: number) => Math.round(value * 10) / 10;

/** A share with exactly one decimal, e.g. "69.0%". */
export const formatShare = (value: number) => `${round1(value).toFixed(1)}%`;

/**
 * The page's one rule for "underused": a feature fewer than `threshold`% of a plan's Sellers use.
 * The AI review's "Underused" label follows the same threshold (PromoteBelowRate on the server).
 */
export const isUnderused = (rate: number, threshold: number) => rate < threshold;

/**
 * How many percentage points fewer of this plan's Sellers use a feature than on the plan before it
 * (always positive); null when the plan before does not include it, or the drop is under
 * {@link MIN_DROP_POINTS}. A rise is not shown: a dearer plan is expected to use more.
 */
export function adoptionDrop(rate: number, previousRate: number | null): number | null {
  if (previousRate === null) return null;
  const drop = round1(previousRate - rate);
  return drop >= MIN_DROP_POINTS ? drop : null;
}

interface SummaryPlan {
  name: string;
  adoption: {
    metric: string;
    label: string;
    includedInPlan: boolean;
    rate: number;
    dailyCap?: number | null;
    usersAtDailyCap?: number | null;
  }[];
}

const isAiFeature = (label: string) => splitAiLabel(label).ai || /^AI\s/.test(label);

/**
 * The table's main points in plain sentences: for each plan, the features its Sellers use clearly
 * less than on the plan before it, then the underused ones. Empty when there is nothing to point out.
 */
export function adoptionSummary(plans: SummaryPlan[], underusedBelow: number): string[] {
  const lines: string[] = [];
  plans.forEach((plan, index) => {
    const before = plans[index - 1];
    if (!before) return;
    const drops = plan.adoption
      .filter((feature) => feature.includedInPlan)
      .map((feature) => {
        const previous = before.adoption.find((item) => item.metric === feature.metric);
        return {
          label: splitAiLabel(feature.label).name,
          ai: isAiFeature(feature.label),
          drop: adoptionDrop(feature.rate, previous?.includedInPlan ? previous.rate : null),
        };
      })
      .filter((item): item is { label: string; ai: boolean; drop: number } => item.drop !== null)
      .sort((a, b) => b.drop - a.drop);
    if (drops.length === 0) return;
    const kind = drops.every((item) => item.ai)
      ? drops.length === 1
        ? "AI feature is"
        : "AI features are"
      : drops.length === 1
        ? "feature is"
        : "features are";
    const list = drops.map((item) => `${item.label} (▼${item.drop.toFixed(1)})`).join(", ");
    lines.push(
      `${drops.length} ${kind} used less on ${plan.name} than on ${before.name}: ${list}.`
    );
  });

  const underused = plans.flatMap((plan) =>
    plan.adoption
      .filter((feature) => feature.includedInPlan && isUnderused(feature.rate, underusedBelow))
      .map((feature) => ({ plan: plan.name, label: splitAiLabel(feature.label).name }))
  );
  if (underused.length > 0) {
    const byFeature = new Map<string, string[]>();
    for (const item of underused)
      byFeature.set(item.label, [...(byFeature.get(item.label) ?? []), item.plan]);
    const list = [...byFeature]
      .map(([label, names]) => `${label} on ${names.join(" and ")}`)
      .join("; ");
    lines.push(`Used by under ${underusedBelow}% of Sellers: ${list}.`);
  }

  // Only when someone actually ran into a daily safety cap: a sign the cap or the plan is too small.
  const capped = plans.flatMap((plan) =>
    plan.adoption
      .filter((feature) => feature.includedInPlan && (feature.usersAtDailyCap ?? 0) > 0 && feature.dailyCap != null)
      .map((feature) => {
        const users = feature.usersAtDailyCap!;
        return `${users} ${users === 1 ? "Seller" : "Sellers"} on ${plan.name} reached the daily ${splitAiLabel(feature.label).name.toLowerCase()} cap (${feature.dailyCap!.toLocaleString("en-US")} a day)`;
      })
  );
  if (capped.length > 0) lines.push(`${capped.join("; ")}.`);
  return lines;
}

/** "Lifestyle mockups (AI)" → name "Lifestyle mockups" with an AI badge. */
export function splitAiLabel(label: string): { name: string; ai: boolean } {
  const match = /^(.*?)\s*\(AI\)\s*$/.exec(label);
  return match ? { name: match[1], ai: true } : { name: label, ai: false };
}

/** The rows in workflow order; features not in {@link FEATURE_ORDER} keep their order and come last. */
export function orderFeatures<T extends { metric: string }>(rows: T[]): T[] {
  const rank = (metric: string) => {
    const index = FEATURE_ORDER.indexOf(metric);
    return index < 0 ? FEATURE_ORDER.length : index;
  };
  return [...rows].sort((a, b) => rank(a.metric) - rank(b.metric));
}
