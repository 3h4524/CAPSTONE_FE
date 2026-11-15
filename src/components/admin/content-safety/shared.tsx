import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CircleDashed, DatabaseZap, ShieldCheck, ShieldX } from "lucide-react";

import { SectionCard } from "@/components/admin/image-quality/section-card";
import type {
  ModerationCategory,
  ModerationDecider,
  ModerationDecision,
  ModerationRangeDays,
} from "@/types/admin-moderation";
import { cn } from "@/utils/cn";

export const RANGE_OPTIONS: ModerationRangeDays[] = [7, 30, 90];

export const CATEGORY_LABELS: Record<ModerationCategory, string> = {
  sexual: "Sexual",
  sexual_minors: "Minors (sexual)",
  violence_gore: "Violence & gore",
  hate: "Hate",
  self_harm: "Self-harm",
  illegal: "Illegal goods",
  ip_trademark: "Brands & IP",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ModerationCategory[];

export const FEATURE_LABELS: Record<string, string> = {
  design_generation: "Design generation",
  ai_studio_frame: "AI Studio keyframe",
  ai_video: "AI scene video",
};

export const SUBJECT_LABELS: Record<string, string> = {
  batch: "Batch",
  product: "Product",
  product_prompt: "Product prompt",
  batch_job: "Job instructions",
  design_template: "Design template",
  style_preset: "Art style",
  workflow: "Workflow",
  ai_shot: "Video scene prompt",
  studio_frame_prompt: "Keyframe prompt",
  design_image: "Design image",
  mockup_image: "Keyframe image",
};

export const featureLabel = (feature: string) => FEATURE_LABELS[feature] ?? feature;
export const subjectLabel = (subject: string) => SUBJECT_LABELS[subject] ?? subject;

// Validated with the dataviz palette checker against both card surfaces (CVD and normal-vision separation pass in the
// stacking order allow → unchecked → flagged → block). Unchecked is a deliberate neutral, so it always ships with a
// label, the legend and the table view.
export const DECISION_CHART_COLORS: Record<ModerationDecision, string> = {
  allow: "#059669",
  unchecked: "#94a3b8",
  flagged: "#d97706",
  block: "#e11d48",
};

type Tone = { label: string; icon: LucideIcon; className: string };

export const DECISIONS: Record<ModerationDecision, Tone> = {
  block: {
    label: "Blocked",
    icon: ShieldX,
    className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  },
  flagged: {
    label: "Flagged",
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  },
  allow: {
    label: "Allowed",
    icon: ShieldCheck,
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  unchecked: {
    label: "Unchecked",
    icon: CircleDashed,
    className: "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-500/20 dark:text-ink-300 dark:ring-ink-500/30",
  },
};

export const DECIDERS: Record<ModerationDecider, { label: string; className: string }> = {
  blocklist: {
    label: "Blocklist",
    className: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30",
  },
  gemini: {
    label: "Gemini",
    className: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  },
  provider_safety: {
    label: "Gemini safety filter",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
  },
  error: {
    label: "Check failed",
    className: "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-500/20 dark:text-ink-300 dark:ring-ink-500/30",
  },
  disabled: {
    label: "Classifier off",
    className: "bg-ink-100 text-ink-700 ring-ink-200 dark:bg-ink-500/20 dark:text-ink-300 dark:ring-ink-500/30",
  },
};

const chipBase = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export const DecisionBadge = ({ decision, className }: { decision: ModerationDecision; className?: string }) => {
  const { label, icon: Icon, className: tone } = DECISIONS[decision] ?? DECISIONS.unchecked;
  return (
    <span className={cn(chipBase, tone, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
};

export const DeciderBadge = ({ decider }: { decider: ModerationDecider }) => {
  const { label, className } = DECIDERS[decider] ?? DECIDERS.error;
  return <span className={cn(chipBase, className)}>{label}</span>;
};

export const CategoryChips = ({ categories }: { categories: ModerationCategory[] }) =>
  categories.length === 0 ? (
    <span className="text-ink-400 text-xs">—</span>
  ) : (
    <span className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <span
          key={category}
          className="border-ink-200 text-ink-700 bg-ink-50 dark:bg-ink-800/40 dark:text-ink-200 dark:border-ink-700 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
        >
          {CATEGORY_LABELS[category] ?? category}
        </span>
      ))}
    </span>
  );

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value * 100)}%`;

/** Shown wherever data would be when the moderation tables are not in this database yet. */
export const StorageMissingBanner = () => (
  <div
    role="status"
    className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
  >
    <DatabaseZap className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div>
      <p className="font-semibold">The moderation tables are not in this database yet.</p>
      <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/80">
        Run the content moderation migration. Until then the guardrail checks with Gemini only, keeps no log, and the
        blocklist and settings cannot be changed here.
      </p>
    </div>
  </div>
);

export const PanelMessage = ({
  title,
  description,
  tone = "neutral",
  action,
}: {
  title: string;
  description?: string;
  tone?: "neutral" | "error";
  action?: React.ReactNode;
}) => (
  <div
    role={tone === "error" ? "alert" : undefined}
    className={cn(
      "flex flex-col items-center gap-1.5 px-6 py-10 text-center",
      tone === "error" ? "text-rose-700 dark:text-rose-300" : "text-ink-500"
    )}
  >
    <p className="text-ink-800 dark:text-ink-100 text-sm font-semibold">{title}</p>
    {description ? <p className="max-w-md text-[13px] leading-relaxed">{description}</p> : null}
    {action}
  </div>
);

/** The admin section card with its body padded. */
export const Section = ({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) => (
  <SectionCard title={title} description={description} actions={actions} className={className}>
    <div className={cn("px-5 py-4 max-md:px-4 sm:px-6", bodyClassName)}>{children}</div>
  </SectionCard>
);
