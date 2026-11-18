"use client";

import { useEffect, useState } from "react";

import { i18n } from "@/i18n/client";
import type { TestReportRun } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

const formatStaticDuration = (durationMs: number) => {
  const t = i18n.t.bind(i18n);
  if (durationMs <= 0) return "—";
  if (durationMs < 1000)
    return t("admin.testReports.runTook.milliseconds", { value: durationMs });
  const seconds = durationMs / 1000;
  if (seconds < 60)
    return t("admin.testReports.runTook.seconds", { value: seconds.toFixed(1) });
  const minutes = Math.floor(seconds / 60);
  return t("admin.testReports.runTook.minutesSeconds", {
    minutes,
    seconds: Math.round(seconds % 60),
  });
};

const formatElapsed = (seconds: number) => {
  const t = i18n.t.bind(i18n);
  if (seconds < 60) return t("admin.testReports.runTook.seconds", { value: seconds });
  return t("admin.testReports.runTook.minutesSeconds", {
    minutes: Math.floor(seconds / 60),
    seconds: seconds % 60,
  });
};

type RunTookProps = {
  run: TestReportRun;
  className?: string;
};

export const RunTook = ({ run, className }: RunTookProps) => {
  const isRunning = run.status === "running";
  const [elapsedSeconds, setElapsedSeconds] = useState(1);

  useEffect(() => {
    if (!isRunning) return;

    const startedMs = new Date(run.startedAtUtc).getTime();
    const tick = () =>
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - startedMs) / 1000)));

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, run.startedAtUtc]);

  return (
    <span className={cn(isRunning && "font-mono text-sky-600 dark:text-sky-400", className)}>
      {isRunning ? formatElapsed(elapsedSeconds) : formatStaticDuration(run.durationMs)}
    </span>
  );
};
