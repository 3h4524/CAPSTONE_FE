import Link from "next/link";
import type { TFunction } from "i18next";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  aiSummary,
  biggestDrop,
  bucketLabel,
  changeBadge,
  type DashboardTone,
  failureTone,
  formatUsd,
  funnelSteps,
  percentChange,
  periodDays,
} from "@/helpers/admin-dashboard";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { AdminOperationsDto } from "@/types/admin";

type AdminOperationsRowProps = {
  operations?: AdminOperationsDto;
  isLoading: boolean;
};

const TEXT: Record<DashboardTone, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  sky: "text-sky-600 dark:text-sky-400",
  violet: "text-violet-600 dark:text-violet-400",
  slate: "text-ink-500",
};

const AI_FEATURE_LABEL_KEYS: Record<string, string> = {
  image_generation: "admin.dashboard.operations.aiFeatures.imageGeneration",
  mockup: "admin.dashboard.operations.aiFeatures.mockup",
  listing: "admin.dashboard.operations.aiFeatures.listing",
  video: "admin.dashboard.operations.aiFeatures.video",
};

const aiFeatureLabel = (feature: string, t: TFunction<"common">) => {
  const labelKey = AI_FEATURE_LABEL_KEYS[feature];
  if (labelKey) return t(labelKey);
  const label = feature.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const DOT: Record<DashboardTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  slate: "bg-ink-300",
};

const AdminOperationsRow = ({ operations, isLoading }: AdminOperationsRowProps) => {
  const { t } = useTranslation("common");

  return (
  <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-3">
    <OperationsCard
      title={t("admin.dashboard.operations.throughput")}
      subtitle={t("admin.dashboard.operations.throughputSubtitle")}
      href="/admin/analytics"
    >
      {operations ? <Throughput operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
    <OperationsCard
      title={t("admin.dashboard.operations.funnel")}
      subtitle={t("admin.dashboard.operations.funnelSubtitle")}
      href="/admin/analytics"
    >
      {operations ? <Funnel operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
    <OperationsCard
      title={t("admin.dashboard.operations.aiUsage")}
      subtitle={t("admin.dashboard.operations.aiUsageSubtitle")}
      href="/admin/analytics"
    >
      {operations ? <AiUsage operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
  </div>
  );
};

const OperationsCard = ({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation("common");

  return (
  <section className="border-ink-200 bg-card flex flex-col rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-md:p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-ink-900 text-sm font-semibold">{title}</h3>
        <p className="text-ink-400 mt-0.5 text-xs">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="text-ink-500 hover:text-ink-900 flex shrink-0 items-center gap-0.5 text-xs font-medium max-md:-my-1.5 max-md:min-h-8"
      >
        {t("admin.dashboard.operations.details")} <ArrowUpRight className="size-3" />
      </Link>
    </div>
    <div className="mt-4 flex flex-1 flex-col">{children}</div>
  </section>
  );
};

const Placeholder = ({ isLoading }: { isLoading: boolean }) => {
  const { t } = useTranslation("common");

  return isLoading ? (
    <div className="bg-ink-100 h-48 animate-pulse rounded-lg" />
  ) : (
    <p className="text-ink-400 flex h-48 items-center justify-center text-xs">
      {t("admin.dashboard.operations.loadError")}
    </p>
  );
};

const Headline = ({
  value,
  unit,
  aside,
}: {
  value: string;
  unit: string;
  aside?: React.ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3">
    <p className="font-display text-ink-900 text-2xl font-semibold tracking-tight tabular-nums">
      {value}
      <span className="text-ink-400 ml-1 text-[11px] font-medium">{unit}</span>
    </p>
    {aside && <div className="text-ink-500 text-right text-xs">{aside}</div>}
  </div>
);

const Insight = ({ tone, children }: { tone: DashboardTone; children: React.ReactNode }) => (
  <div className="mt-auto pt-4">
    <p className="border-ink-100 text-ink-600 flex gap-2 border-t pt-3 text-xs leading-relaxed">
      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      <span>{children}</span>
    </p>
  </div>
);

const Throughput = ({ operations }: { operations: AdminOperationsDto }) => {
  const { t } = useTranslation("common");
  const buckets = operations.throughput;
  const products = buckets.reduce((sum, bucket) => sum + bucket.products, 0);
  const jobs = buckets.reduce((sum, bucket) => sum + bucket.jobs, 0);
  const perDay = products / periodDays(operations.periodStart, operations.periodEnd);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.products));
  const busiest = buckets.reduce(
    (best, bucket) => (bucket.products > best.products ? bucket : best),
    buckets[0]
  );
  const sellersChange = percentChange(operations.activeSellers, operations.previousActiveSellers);
  const sellers = changeBadge(sellersChange);

  return (
    <>
      <Headline
        value={products.toLocaleString()}
        unit={t("admin.dashboard.operations.productsUnit")}
        aside={
          <>
            <span className="text-ink-800 font-semibold tabular-nums">
              {perDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>{" "}
            {t("admin.dashboard.operations.aDay")}
          </>
        }
      />
      <dl className="text-ink-500 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex gap-1">
          <dt>{t("admin.dashboard.operations.batchJobs")}</dt>
          <dd className="text-ink-800 font-semibold tabular-nums">{jobs.toLocaleString()}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt>{t("admin.dashboard.operations.activeSellers")}</dt>
          <dd className="text-ink-800 font-semibold tabular-nums">
            {operations.activeSellers.toLocaleString()}
          </dd>
          {sellersChange !== null && (
            <dd className={`font-semibold tabular-nums ${TEXT[sellers.tone]}`}>{sellers.text}</dd>
          )}
        </div>
      </dl>
      <div
        className="mt-4 flex h-28 items-end gap-px"
        role="img"
        aria-label={t("admin.dashboard.operations.productsPerPeriodAria")}
      >
        {buckets.map((bucket) => (
          <div
            key={bucket.start}
            title={t("admin.dashboard.operations.barTitle", {
              label: bucketLabel(bucket.start, operations.bucket),
              products: bucket.products.toLocaleString(),
              jobs: bucket.jobs.toLocaleString(),
            })}
            className={`min-h-px flex-1 rounded-t-sm transition-colors ${
              bucket === busiest && bucket.products > 0
                ? "bg-ink-600"
                : "bg-ink-300 hover:bg-ink-400"
            }`}
            style={{ height: `${(bucket.products / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-ink-400 mt-1 flex justify-between text-[10px]">
        <span>{bucketLabel(buckets[0].start, operations.bucket)}</span>
        <span>{bucketLabel(buckets[buckets.length - 1].start, operations.bucket)}</span>
      </div>
      <Insight tone="slate">
        {products > 0 ? (
          <>
            {t("admin.dashboard.operations.busiest")}{" "}
            <strong>{bucketLabel(busiest.start, operations.bucket)}</strong>{" "}
            {t("admin.dashboard.operations.busiestWith", {
              products: busiest.products.toLocaleString(),
            })}
          </>
        ) : (
          t("admin.dashboard.operations.noProductsPeriod")
        )}
      </Insight>
    </>
  );
};

const Funnel = ({ operations }: { operations: AdminOperationsDto }) => {
  const { t } = useTranslation("common");
  const steps = funnelSteps(operations.funnel);
  const drop = biggestDrop(steps);
  const reached = steps[steps.length - 1];
  const localizedStep = (label: string) => {
    const match = steps.find((step) => step.label === label);
    return match ? t(`admin.dashboard.operations.funnelSteps.${match.key}`) : label;
  };

  return (
    <>
      <Headline
        value={`${reached.ofCreated.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
        unit={t("admin.dashboard.operations.publishedUnit")}
        aside={t("admin.dashboard.operations.ofProducts", {
          total: operations.funnel.products.toLocaleString(),
        })}
      />
      <ol className="mt-4 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-700 font-medium">
                {t(`admin.dashboard.operations.funnelSteps.${step.key}`)}
              </span>
              <span className="text-ink-400 text-[10px]">
                <span className="text-ink-800 text-xs font-semibold tabular-nums">
                  {step.count.toLocaleString()}
                </span>
                {index > 0 &&
                  ` · ${t("admin.dashboard.operations.ofPrevious", {
                    percent: step.fromPrevious.toFixed(1),
                  })}`}
              </span>
            </div>
            <div className="bg-ink-100 mt-1 h-2 overflow-hidden rounded-full">
              <div
                className="bg-ink-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${step.ofCreated}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      <Insight
        tone={
          operations.funnel.products === 0
            ? "slate"
            : drop && drop.kept < 50
              ? "rose"
              : drop
                ? "amber"
                : "emerald"
        }
      >
        {operations.funnel.products === 0 ? (
          t("admin.dashboard.operations.noProductsPeriod")
        ) : drop ? (
          <>
            {t("admin.dashboard.operations.biggestDrop")}{" "}
            <strong>
              {localizedStep(drop.from)} → {localizedStep(drop.to)}
            </strong>
            {t("admin.dashboard.operations.biggestDropRest", {
              lost: drop.lost.toLocaleString(),
              kept: drop.kept.toFixed(1),
            })}
          </>
        ) : (
          t("admin.dashboard.operations.everyProductThrough")
        )}
      </Insight>
    </>
  );
};

const AiUsage = ({ operations }: { operations: AdminOperationsDto }) => {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const summary = aiSummary(operations.aiUsage, operations.funnel.products);
  const overall = failureTone(summary.failureRate);

  return (
    <>
      <Headline
        value={formatUsd(summary.costUsd)}
        unit={t("admin.dashboard.operations.spentUnit")}
        aside={
          summary.costPerProduct !== null && (
            <>
              <span className="text-ink-800 font-semibold tabular-nums">
                {formatUsd(summary.costPerProduct)}
              </span>{" "}
              {t("admin.dashboard.operations.perProduct")}
            </>
          )
        }
      />
      <p className="text-ink-500 mt-2 flex items-center gap-1 text-xs">
        <span className="text-ink-800 font-semibold tabular-nums">
          {summary.calls.toLocaleString()}
        </span>{" "}
        {t("admin.dashboard.operations.callsDot")}{" "}
        <span className={`font-semibold tabular-nums ${TEXT[overall]}`}>
          {t("admin.dashboard.operations.percentFailed", { rate: summary.failureRate.toFixed(1) })}
        </span>
      </p>
      {operations.aiUsage.length === 0 ? (
        <p className="text-ink-400 mt-4 text-xs">{t("admin.dashboard.operations.noAiCallsPeriod")}</p>
      ) : isPhone ? (
        <ul className="divide-ink-100 mt-3 divide-y text-xs">
          {operations.aiUsage.map((feature) => {
            const rate = feature.calls > 0 ? (feature.failed / feature.calls) * 100 : 0;
            return (
              <li key={feature.feature} className="py-2">
                <p className="flex justify-between gap-3">
                  <span className="text-ink-700 min-w-0 truncate font-medium">{aiFeatureLabel(feature.feature, t)}</span>
                  <span className="text-ink-800 shrink-0 font-semibold tabular-nums">{formatUsd(feature.costUsd)}</span>
                </p>
                <p className="text-ink-500 mt-0.5 tabular-nums">
                  {feature.calls.toLocaleString()} {t("admin.dashboard.operations.callsDot")}{" "}
                  <span className={`font-semibold ${TEXT[failureTone(rate)]}`}>
                    {t("admin.dashboard.operations.percentFailed", { rate: rate.toFixed(1) })}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-ink-400 text-[11px]">
            <tr>
              <th className="py-1 font-medium">{t("admin.dashboard.operations.featureColumn")}</th>
              <th className="py-1 text-right font-medium">{t("admin.dashboard.operations.callsColumn")}</th>
              <th className="py-1 text-right font-medium">{t("admin.dashboard.operations.failedColumn")}</th>
              <th className="py-1 text-right font-medium">{t("admin.dashboard.operations.costColumn")}</th>
            </tr>
          </thead>
          <tbody className="divide-ink-100 divide-y">
            {operations.aiUsage.map((feature) => {
              const rate = feature.calls > 0 ? (feature.failed / feature.calls) * 100 : 0;
              return (
                <tr key={feature.feature}>
                  <td className="text-ink-700 py-1.5">{aiFeatureLabel(feature.feature, t)}</td>
                  <td className="text-ink-600 py-1.5 text-right tabular-nums">
                    {feature.calls.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right">
                    <span className={`font-semibold tabular-nums ${TEXT[failureTone(rate)]}`}>
                      {rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-ink-800 py-1.5 text-right font-medium tabular-nums">
                    {formatUsd(feature.costUsd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Insight
        tone={
          summary.worst
            ? failureTone(summary.worst.failureRate)
            : summary.calls > 0
              ? "emerald"
              : "slate"
        }
      >
        {summary.worst ? (
          <>
            <strong>{aiFeatureLabel(summary.worst.feature, t)}</strong>{" "}
            {t("admin.dashboard.operations.featureFailsShare", {
              rate: summary.worst.failureRate.toFixed(1),
              failed: summary.worst.failed.toLocaleString(),
            })}
          </>
        ) : summary.calls > 0 ? (
          t("admin.dashboard.operations.everyFeatureUnder2")
        ) : (
          t("admin.dashboard.operations.noAiWorkPeriod")
        )}
      </Insight>
    </>
  );
};

export { AdminOperationsRow };
