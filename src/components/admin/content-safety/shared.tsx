import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CircleDashed, DatabaseZap, ShieldCheck, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/admin/image-quality/section-card";
import { i18n } from "@/i18n/client";
import type {
  ModerationCategory,
  ModerationDecider,
  ModerationDecision,
  ModerationRangeDays,
} from "@/types/admin-moderation";
import { cn } from "@/utils/cn";

export const RANGE_OPTIONS: ModerationRangeDays[] = [7, 30, 90];

export const CATEGORY_LABEL_KEYS: Record<ModerationCategory, string> = {
  sexual: "admin.contentSafety.categories.sexual",
  sexual_minors: "admin.contentSafety.categories.sexualMinors",
  violence_gore: "admin.contentSafety.categories.violenceGore",
  hate: "admin.contentSafety.categories.hate",
  self_harm: "admin.contentSafety.categories.selfHarm",
  illegal: "admin.contentSafety.categories.illegal",
  ip_trademark: "admin.contentSafety.categories.ipTrademark",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL_KEYS) as ModerationCategory[];

export const FEATURE_LABEL_KEYS: Record<string, string> = {
  design_generation: "admin.contentSafety.features.designGeneration",
  ai_studio_frame: "admin.contentSafety.features.aiStudioFrame",
  ai_video: "admin.contentSafety.features.aiVideo",
};

export const SUBJECT_LABEL_KEYS: Record<string, string> = {
  batch: "admin.contentSafety.subjects.batch",
  product: "admin.contentSafety.subjects.product",
  product_prompt: "admin.contentSafety.subjects.productPrompt",
  batch_job: "admin.contentSafety.subjects.batchJob",
  design_template: "admin.contentSafety.subjects.designTemplate",
  style_preset: "admin.contentSafety.subjects.stylePreset",
  workflow: "admin.contentSafety.subjects.workflow",
  ai_shot: "admin.contentSafety.subjects.aiShot",
  studio_frame_prompt: "admin.contentSafety.subjects.studioFramePrompt",
  design_image: "admin.contentSafety.subjects.designImage",
  mockup_image: "admin.contentSafety.subjects.mockupImage",
};

export const featureLabel = (feature: string) => {
  const t = i18n.t.bind(i18n);
  const key = FEATURE_LABEL_KEYS[feature];
  return key ? t(key) : feature;
};

export const subjectLabel = (subject: string) => {
  const t = i18n.t.bind(i18n);
  const key = SUBJECT_LABEL_KEYS[subject];
  return key ? t(key) : subject;
};

// Validated with the dataviz palette checker against both card surfaces (CVD and normal-vision separation pass in the
// stacking order allow → unchecked → flagged → block). Unchecked is a deliberate neutral, so it always ships with a
// label, the legend and the table view.
export const DECISION_CHART_COLORS: Record<ModerationDecision, string> = {
  allow: "#059669",
  unchecked: "#94a3b8",
  flagged: "#d97706",
  block: "#e11d48",
};

type Tone = { icon: LucideIcon; className: string };

export const DECISION_LABEL_KEYS: Record<ModerationDecision, string> = {
  block: "admin.contentSafety.decisions.block",
  flagged: "admin.contentSafety.decisions.flagged",
  allow: "admin.contentSafety.decisions.allow",
  unchecked: "admin.contentSafety.decisions.unchecked",
};

export const DECISIONS: Record<ModerationDecision, Tone> = {
  block: {
    icon: ShieldX,
    className: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  },
  flagged: {
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  },
  allow: {
    icon: ShieldCheck,
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  unchecked: {
    icon: CircleDashed,
    className: "bg-ink-100 text-ink-700 ring-ink-200",
  },
};

export const DECIDER_LABEL_KEYS: Record<ModerationDecider, string> = {
  blocklist: "admin.contentSafety.deciders.blocklist",
  gemini: "admin.contentSafety.deciders.gemini",
  provider_safety: "admin.contentSafety.deciders.providerSafety",
  error: "admin.contentSafety.deciders.error",
  disabled: "admin.contentSafety.deciders.disabled",
};

export const DECIDERS: Record<ModerationDecider, { className: string }> = {
  blocklist: {
    className: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30",
  },
  gemini: {
    className: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  },
  provider_safety: {
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30",
  },
  error: {
    className: "bg-ink-100 text-ink-700 ring-ink-200",
  },
  disabled: {
    className: "bg-ink-100 text-ink-700 ring-ink-200",
  },
};

const chipBase = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export const DecisionBadge = ({ decision, className }: { decision: ModerationDecision; className?: string }) => {
  const { t } = useTranslation("common");
  const { icon: Icon, className: tone } = DECISIONS[decision] ?? DECISIONS.unchecked;
  const key = DECISION_LABEL_KEYS[decision] ?? DECISION_LABEL_KEYS.unchecked;
  return (
    <span className={cn(chipBase, tone, className)}>
      <Icon className="size-3" aria-hidden="true" />
      {t(key)}
    </span>
  );
};

export const DeciderBadge = ({ decider }: { decider: ModerationDecider }) => {
  const { t } = useTranslation("common");
  const { className } = DECIDERS[decider] ?? DECIDERS.error;
  const key = DECIDER_LABEL_KEYS[decider] ?? DECIDER_LABEL_KEYS.error;
  return <span className={cn(chipBase, className)}>{t(key)}</span>;
};

export const CategoryChips = ({ categories }: { categories: ModerationCategory[] }) => {
  const { t } = useTranslation("common");
  return categories.length === 0 ? (
    <span className="text-ink-400 text-xs">—</span>
  ) : (
    <span className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <span
          key={category}
          className="border-ink-200 text-ink-700 bg-ink-50 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
        >
          {t(CATEGORY_LABEL_KEYS[category])}
        </span>
      ))}
    </span>
  );
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value * 100)}%`;

/** Shown wherever data would be when the moderation tables are not in this database yet. */
export const StorageMissingBanner = () => {
  const { t } = useTranslation("common");
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <DatabaseZap className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{t("admin.contentSafety.storageBanner.title")}</p>
        <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/80">{t("admin.contentSafety.storageBanner.description")}</p>
      </div>
    </div>
  );
};

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
    <p className="text-ink-800 text-sm font-semibold">{title}</p>
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
