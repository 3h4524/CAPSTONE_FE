import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RingGauge, type RingTone } from "@/components/dashboard/ring-gauge";
import { Card } from "@/components/ui/card";
import type { ActiveBatch } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

const humanizeStatus = (status: string) => {
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const STATUS_STYLES: Record<string, { tone: RingTone; chip: string }> = {
  running: { tone: "brand", chip: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  queued: { tone: "slate", chip: "bg-ink-100 text-ink-600" },
  paused: { tone: "brand", chip: "bg-ink-100 text-ink-700 border border-ink-200/60" },
};

/** The newest unfinished batch job as a progress ring; an invitation to start one when none runs. */
export const BatchGaugeCard = ({ batches }: { batches: ActiveBatch[] }) => {
  const { t, i18n } = useTranslation("common");
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" });
  const batch = batches[0];
  const style = batch ? (STATUS_STYLES[batch.status] ?? STATUS_STYLES.queued) : undefined;
  const tone: RingTone = batch && batch.failed > 0 && batch.status === "running" ? "amber" : (style?.tone ?? "slate");

  return (
    <Card className="h-full gap-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t("dashboard.batchGauge.title")}</h2>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {batch ? batch.name : t("dashboard.batchGauge.noneRunning")}
          </p>
        </div>
        {batch && style && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              style.chip
            )}
          >
            {t(`batches.statuses.${batch.status.toLowerCase()}`, { defaultValue: humanizeStatus(batch.status.toLowerCase()) })}
          </span>
        )}
      </div>

      {batch ? (
        <>
          <Link href={batch.url} className="mx-auto transition-transform duration-300 hover:scale-105">
            <RingGauge value={batch.progressPercent} tone={tone} label={t("dashboard.batchGauge.progressAria", { name: batch.name })}>
              <span className="text-2xl font-semibold tabular-nums">
                {Math.round(batch.progressPercent)}%
              </span>
              <span className="text-muted-foreground text-[11px]">{t("dashboard.batchGauge.complete")}</span>
            </RingGauge>
          </Link>
          <dl className="divide-ink-200 border-ink-100 bg-ink-50/80 grid grid-cols-2 gap-2 divide-x rounded-xl border p-3 text-center text-xs">
            <div>
              <dt className="text-muted-foreground">{t("dashboard.batchGauge.done")}</dt>
              <dd className="font-semibold tabular-nums">
                {batch.processed}/{batch.total}
                {batch.failed > 0 && (
                  <span className="text-rose-600 dark:text-rose-400"> · {t("dashboard.batchGauge.failedCount", { count: batch.failed })}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("dashboard.batchGauge.endsAround")}</dt>
              <dd className="font-semibold tabular-nums">
                {batch.status === "running" && batch.estimatedCompletionAt
                  ? formatTime(batch.estimatedCompletionAt)
                  : batch.status === "paused"
                    ? t("batches.statuses.paused")
                    : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-auto flex items-center justify-between gap-2 text-xs font-medium">
            <Link
              href={batch.url}
              className="text-ink-800 inline-flex items-center gap-1 hover:text-black hover:underline"
            >
              {t("dashboard.batchGauge.openBatch")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            {batches.length > 1 && (
              <Link href="/batches" className="text-muted-foreground hover:text-foreground">
                {t("dashboard.batchGauge.more", { count: batches.length - 1 })}
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <RingGauge value={0} tone="slate" label={t("dashboard.batchGauge.batchProgress")}>
            <Layers3 className="text-muted-foreground size-7" aria-hidden="true" />
          </RingGauge>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#c2410c] hover:underline dark:text-[#eda182]"
          >
            {t("dashboard.batchGauge.startBatch")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </Card>
  );
};
