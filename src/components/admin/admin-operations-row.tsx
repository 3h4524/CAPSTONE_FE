import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  aiFeatureLabel,
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
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  sky: "text-sky-600",
  violet: "text-violet-600",
  slate: "text-slate-500",
};

const DOT: Record<DashboardTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  slate: "bg-slate-300",
};

const AdminOperationsRow = ({ operations, isLoading }: AdminOperationsRowProps) => (
  <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-3">
    <OperationsCard
      title="Throughput"
      subtitle="Products created and sellers at work"
      href="/admin/analytics"
    >
      {operations ? <Throughput operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
    <OperationsCard
      title="Pipeline funnel"
      subtitle="How far this period's products got"
      href="/admin/analytics"
    >
      {operations ? <Funnel operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
    <OperationsCard
      title="AI usage"
      subtitle="What the AI work cost and how often it failed"
      href="/admin/analytics"
    >
      {operations ? <AiUsage operations={operations} /> : <Placeholder isLoading={isLoading} />}
    </OperationsCard>
  </div>
);

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
}) => (
  <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-md:p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-900 max-md:-my-1.5 max-md:min-h-8"
      >
        Details <ArrowUpRight className="size-3" />
      </Link>
    </div>
    <div className="mt-4 flex flex-1 flex-col">{children}</div>
  </section>
);

const Placeholder = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? (
    <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
  ) : (
    <p className="flex h-48 items-center justify-center text-xs text-slate-400">
      Could not load this period.
    </p>
  );

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
    <p className="font-display text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
      {value}
      <span className="ml-1 text-[11px] font-medium text-slate-400">{unit}</span>
    </p>
    {aside && <div className="text-right text-xs text-slate-500">{aside}</div>}
  </div>
);

const Insight = ({ tone, children }: { tone: DashboardTone; children: React.ReactNode }) => (
  <div className="mt-auto pt-4">
    <p className="flex gap-2 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      <span>{children}</span>
    </p>
  </div>
);

const Throughput = ({ operations }: { operations: AdminOperationsDto }) => {
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
        unit="products"
        aside={
          <>
            <span className="font-semibold text-slate-800 tabular-nums">
              {perDay.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>{" "}
            a day
          </>
        }
      />
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <div className="flex gap-1">
          <dt>Batch jobs</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{jobs.toLocaleString()}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt>Active sellers</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">
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
        aria-label="Products created per period"
      >
        {buckets.map((bucket) => (
          <div
            key={bucket.start}
            title={`${bucketLabel(bucket.start, operations.bucket)}: ${bucket.products.toLocaleString()} products, ${bucket.jobs.toLocaleString()} jobs`}
            className={`min-h-px flex-1 rounded-t-sm transition-colors ${
              bucket === busiest && bucket.products > 0
                ? "bg-[#475569]"
                : "bg-[#cbd5e1] hover:bg-[#94a3b8]"
            }`}
            style={{ height: `${(bucket.products / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{bucketLabel(buckets[0].start, operations.bucket)}</span>
        <span>{bucketLabel(buckets[buckets.length - 1].start, operations.bucket)}</span>
      </div>
      <Insight tone="slate">
        {products > 0 ? (
          <>
            Busiest: <strong>{bucketLabel(busiest.start, operations.bucket)}</strong> with{" "}
            {busiest.products.toLocaleString()} products.
          </>
        ) : (
          "No products were created in this period."
        )}
      </Insight>
    </>
  );
};

const Funnel = ({ operations }: { operations: AdminOperationsDto }) => {
  const steps = funnelSteps(operations.funnel);
  const drop = biggestDrop(steps);
  const reached = steps[steps.length - 1];

  return (
    <>
      <Headline
        value={`${reached.ofCreated.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`}
        unit="published"
        aside={`of ${operations.funnel.products.toLocaleString()} products`}
      />
      <ol className="mt-4 space-y-2.5">
        {steps.map((step, index) => (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{step.label}</span>
              <span className="text-[10px] text-slate-400">
                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                  {step.count.toLocaleString()}
                </span>
                {index > 0 && ` · ${step.fromPrevious.toFixed(1)}% of previous`}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#475569] transition-all duration-500"
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
          "No products were created in this period."
        ) : drop ? (
          <>
            Biggest drop:{" "}
            <strong>
              {drop.from} → {drop.to}
            </strong>
            . {drop.lost.toLocaleString()} products stop there; only {drop.kept.toFixed(1)}% go on.
          </>
        ) : (
          "Every product went all the way to publishing."
        )}
      </Insight>
    </>
  );
};

const AiUsage = ({ operations }: { operations: AdminOperationsDto }) => {
  const isPhone = useIsPhone();
  const summary = aiSummary(operations.aiUsage, operations.funnel.products);
  const overall = failureTone(summary.failureRate);

  return (
    <>
      <Headline
        value={formatUsd(summary.costUsd)}
        unit="spent"
        aside={
          summary.costPerProduct !== null && (
            <>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatUsd(summary.costPerProduct)}
              </span>{" "}
              per product
            </>
          )
        }
      />
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <span className="font-semibold text-slate-800 tabular-nums">
          {summary.calls.toLocaleString()}
        </span>{" "}
        calls ·
        <span className={`font-semibold tabular-nums ${TEXT[overall]}`}>
          {summary.failureRate.toFixed(1)}% failed
        </span>
      </p>
      {operations.aiUsage.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No AI calls in this period.</p>
      ) : isPhone ? (
        <ul className="mt-3 divide-y divide-slate-100 text-xs">
          {operations.aiUsage.map((feature) => {
            const rate = feature.calls > 0 ? (feature.failed / feature.calls) * 100 : 0;
            return (
              <li key={feature.feature} className="py-2">
                <p className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-slate-700">{aiFeatureLabel(feature.feature)}</span>
                  <span className="shrink-0 font-semibold text-slate-800 tabular-nums">{formatUsd(feature.costUsd)}</span>
                </p>
                <p className="mt-0.5 text-slate-500 tabular-nums">
                  {feature.calls.toLocaleString()} calls ·{" "}
                  <span className={`font-semibold ${TEXT[failureTone(rate)]}`}>{rate.toFixed(1)}% failed</span>
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-[11px] text-slate-400">
            <tr>
              <th className="py-1 font-medium">Feature</th>
              <th className="py-1 text-right font-medium">Calls</th>
              <th className="py-1 text-right font-medium">Failed</th>
              <th className="py-1 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {operations.aiUsage.map((feature) => {
              const rate = feature.calls > 0 ? (feature.failed / feature.calls) * 100 : 0;
              return (
                <tr key={feature.feature}>
                  <td className="py-1.5 text-slate-700">{aiFeatureLabel(feature.feature)}</td>
                  <td className="py-1.5 text-right text-slate-600 tabular-nums">
                    {feature.calls.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right">
                    <span className={`font-semibold tabular-nums ${TEXT[failureTone(rate)]}`}>
                      {rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-medium text-slate-800 tabular-nums">
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
            <strong>{aiFeatureLabel(summary.worst.feature)}</strong> fails{" "}
            {summary.worst.failureRate.toFixed(1)}% of calls (
            {summary.worst.failed.toLocaleString()} failed). Check the provider keys and quotas.
          </>
        ) : summary.calls > 0 ? (
          "Every AI feature fails less than 2% of its calls."
        ) : (
          "No AI work in this period."
        )}
      </Insight>
    </>
  );
};

export { AdminOperationsRow };
