"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Clock3, Loader2, RefreshCw, Save, Search } from "lucide-react";

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
      showToast("error", "Add a keyword before enabling background collection.");
      return;
    }
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 10080) {
      showToast("error", "Set an interval between 1 and 10080 minutes.");
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
              ? "Background collection enabled. The first job was queued."
              : "Background collection paused.",
          );
        },
      },
    );
  };

  useEffect(() => {
    if (!collectionJobId) return;
    if (collectionJob.isError) {
      showToast("error", "The collection job could not be found. Please collect again.");
      setCollectionJobId(null);
      return;
    }

    const result = collectionJob.data;
    if (!result) return;
    if (result.status === "completed") {
      showToast(
        "success",
        `Collected ${result.retrievedCount.toLocaleString()} Etsy listings. Metrics refreshed.`,
      );
      setCollectionJobId(null);
      void refetch();
    } else if (result.status === "failed") {
      showToast("error", result.errorMessage ?? "The Etsy collection job failed.");
      setCollectionJobId(null);
    }
  }, [collectionJob.data, collectionJob.isError, collectionJobId, refetch]);

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-muted-foreground text-xs">Seller &gt; Market Insights</p><h1 className="mt-1 text-2xl font-semibold">Market Insights</h1><p className="text-muted-foreground mt-1 max-w-2xl text-sm">Explore public Etsy listing signals, market size proxies, pricing, and keyword surfaces.</p></div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}><RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />Refresh</Button>
      </header>

      <Card className="border-primary/15 bg-hero-gradient">
        <CardContent className="p-4 sm:p-5">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
            <div className="relative min-w-0 flex-1"><Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" /><Input aria-label="Etsy keyword" className="bg-card h-11 pl-10" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search a keyword, e.g. personalized gift" /></div>
            <Button type="submit" size="lg">Analyze keyword</Button>
          </form>
          <p className="text-muted-foreground mt-3 text-xs">Metrics are calculated from stored public Etsy snapshots. Configure background collection below to fetch fresh listings automatically.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase"><Clock3 className="size-3.5" /> Background collection</p>
              <h2 className="mt-1 text-lg font-semibold">Run Etsy research automatically</h2>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm">Saving an enabled schedule queues the first job immediately. Later jobs are created by the backend worker at the selected interval.</p>
            </div>
            <Badge variant={scheduleEnabled ? "default" : "outline"}>{scheduleEnabled ? "Active" : "Paused"}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <label className="flex h-10 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm">
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} size="sm" />
              Enable background job for this keyword
            </label>
            <label className="text-xs font-medium">
              Run every (minutes)
              <Input
                className="mt-2"
                type="number"
                min={1}
                max={10080}
                step={1}
                value={scheduleInterval}
                onChange={(event) => setScheduleInterval(event.target.value)}
                aria-label="Schedule interval in minutes"
              />
            </label>
            <Button type="button" onClick={saveSchedule} disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save schedule
            </Button>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span>{scheduleEnabled && scheduleQuery.data?.nextRunAtUtc ? `Next run: ${new Date(scheduleQuery.data.nextRunAtUtc).toLocaleString()}` : "No background run scheduled"}</span>
            {isCollecting && <span className="text-primary flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Current job is running; metrics will refresh when it ends.</span>}
          </div>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="space-y-4" aria-label="Loading market insights"><Skeleton className="h-28 w-full" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>
      ) : isError || !data ? (
        <Card><CardContent className="p-10 text-center"><p className="text-base font-semibold">No market data for “{keyword}” yet</p><p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">Run public market research for this keyword, then come back here to review its metrics. This page does not treat missing data as zero demand.</p></CardContent></Card>
      ) : <MarketInsightResults data={data} />}
    </div>
  );
}
