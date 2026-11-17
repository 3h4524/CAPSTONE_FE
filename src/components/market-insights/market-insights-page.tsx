"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Clock3, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/helpers/toast";
import { useUpdateMarketInsightSchedule } from "@/hooks/mutations/use-update-market-insight-schedule";
import { useMarketInsightSchedule } from "@/hooks/queries/use-market-insight-schedule";
import { useMarketQueryCollectionJob } from "@/hooks/queries/use-market-query-collection-job";
import { useMarketQueryMetrics } from "@/hooks/queries/use-market-query-metrics";

import { MarketInsightResults } from "./market-insight-results";

const DEFAULT_QUERY = "wedding gift";

export function MarketInsightsPage() {
  const { t, i18n } = useTranslation("common");
  const [input, setInput] = useState(DEFAULT_QUERY);
  const [keyword, setKeyword] = useState(DEFAULT_QUERY);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState("1440");
  const [collectionJobId, setCollectionJobId] = useState<string | null>(null);
  const { data, isPending, isFetching, isError, refetch } = useMarketQueryMetrics(keyword);
  const scheduleQuery = useMarketInsightSchedule();
  const scheduleMutation = useUpdateMarketInsightSchedule();
  const collectionJob = useMarketQueryCollectionJob(collectionJobId);

  const isCollecting = collectionJob.data?.status === "queued" || collectionJob.data?.status === "running";

  useEffect(() => {
    const schedule = scheduleQuery.data;
    if (!schedule) return;
    setScheduleEnabled(schedule.enabled);
    setScheduleInterval(String(schedule.intervalMinutes));
    const scheduledQuery = schedule.queries[0];
    if (scheduledQuery) {
      setInput(scheduledQuery);
      setKeyword(scheduledQuery);
    }
    if (schedule.lastJobId) setCollectionJobId(schedule.lastJobId);
  }, [scheduleQuery.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = input.trim().replace(/\s+/g, " ");
    if (normalized) setKeyword(normalized);
  };

  const saveSchedule = () => {
    const normalized = input.trim().replace(/\s+/g, " ");
    const intervalMinutes = Number(scheduleInterval);
    if (scheduleEnabled && !normalized) {
      showToast("error", t("marketInsights.page.addKeywordFirst"));
      return;
    }
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 10080) {
      showToast("error", t("marketInsights.page.intervalRange"));
      return;
    }

    scheduleMutation.mutate(
      {
        enabled: scheduleEnabled,
        query: normalized,
        intervalMinutes,
      },
      {
        onSuccess: (result) => {
          setKeyword(normalized || keyword);
          if (result.lastJobId) setCollectionJobId(result.lastJobId);
          void scheduleQuery.refetch();
          showToast(
            "success",
            result.enabled
              ? t("marketInsights.page.scheduleEnabled")
              : t("marketInsights.page.schedulePaused"),
          );
        },
      },
    );
  };

  useEffect(() => {
    if (!collectionJobId) return;
    if (collectionJob.isError) {
      showToast("error", t("marketInsights.page.jobNotFound"));
      setCollectionJobId(null);
      return;
    }

    const result = collectionJob.data;
    if (!result) return;
    if (result.status === "completed") {
      showToast(
        "success",
        t("marketInsights.page.collected", { count: result.retrievedCount, formatted: result.retrievedCount.toLocaleString(i18n.language) }),
      );
      setCollectionJobId(null);
      void refetch();
    } else if (result.status === "failed") {
      showToast("error", result.errorMessage ?? t("marketInsights.page.jobFailed"));
      setCollectionJobId(null);
    }
  }, [collectionJob.data, collectionJob.isError, collectionJobId, refetch, t, i18n.language]);

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-muted-foreground text-xs">{t("marketInsights.page.seller")} &gt; {t("navigation.items.marketInsights")}</p><h1 className="mt-1 text-2xl font-semibold">{t("navigation.items.marketInsights")}</h1><p className="text-muted-foreground mt-1 max-w-2xl text-sm">{t("marketInsights.page.description")}</p></div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />{t("marketInsights.page.refresh")}</Button>
      </header>

      <Card className="border-primary/15 bg-hero-gradient">
        <CardContent className="p-4 sm:p-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
            <div className="relative min-w-0 flex-1"><Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" /><Input aria-label={t("marketInsights.page.keywordLabel")} className="bg-card h-11 pl-10" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("marketInsights.page.keywordPlaceholder")} /></div>
            <Button type="submit" size="lg">{t("marketInsights.page.analyze")}</Button>
          </form>
          <p className="text-muted-foreground mt-3 text-xs">{t("marketInsights.page.metricsHint")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase"><Clock3 className="size-3.5" /> {t("marketInsights.page.backgroundCollection")}</p>
              <h2 className="mt-1 text-lg font-semibold">{t("marketInsights.page.runAutomatically")}</h2>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{t("marketInsights.page.scheduleHint")}</p>
            </div>
            <Badge variant={scheduleEnabled ? "default" : "outline"}>{scheduleEnabled ? t("marketInsights.page.active") : t("marketInsights.page.paused")}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm">
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} size="sm" />
              {t("marketInsights.page.enableJob")}
            </label>
            <label className="text-xs font-medium">
              {t("marketInsights.page.runEvery")}
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={10080}
                step={1}
                value={scheduleInterval}
                onChange={(event) => setScheduleInterval(event.target.value)}
                aria-label={t("marketInsights.page.intervalLabel")}
              />
            </label>
            <Button type="button" onClick={saveSchedule} disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t("marketInsights.page.saveSchedule")}
            </Button>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>{scheduleEnabled && scheduleQuery.data?.nextRunAtUtc ? t("marketInsights.page.nextRun", { date: new Date(scheduleQuery.data.nextRunAtUtc).toLocaleString(i18n.language) }) : t("marketInsights.page.noRun")}</span>
            {isCollecting && <span className="text-primary flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> {t("marketInsights.page.jobRunning")}</span>}
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="space-y-4" aria-label={t("marketInsights.page.loading")}><Skeleton className="h-28 w-full" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>
      ) : isError || !data ? (
        <Card><CardContent className="p-10 text-center"><p className="text-base font-semibold">{t("marketInsights.page.noData", { keyword })}</p><p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">{t("marketInsights.page.noDataHint")}</p></CardContent></Card>
      ) : <MarketInsightResults data={data} />}
    </div>
  );
}
