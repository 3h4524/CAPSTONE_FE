"use client";

import React, { useState } from "react";
import { AlertCircle, AlertTriangle, ListFilter, ShieldCheck } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { SystemErrorLogDto } from "@/types/system-statistics";

interface RecentErrorsTableProps {
  recentErrors?: SystemErrorLogDto[];
  isLoading: boolean;
}

// A phone starts on the latest few, each cut to two lines until tapped.
const PHONE_ERRORS = 3;

export function RecentErrorsTable({
  recentErrors = [],
  isLoading,
}: RecentErrorsTableProps) {
  const isPhone = useIsPhone();
  const [showsAll, setShowsAll] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const shownErrors = showsAll ? recentErrors : recentErrors.slice(0, PHONE_ERRORS);
  const getBadgeForErrorType = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("warn")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/50 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700/90 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3 text-amber-500/80" />
          Warning
        </span>
      );
    }
    if (lower.includes("failed") || lower.includes("job")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-500">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Job failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-500">
        <AlertCircle className="h-3 w-3 text-rose-400" />
        Error
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-ink-200/80 bg-card shadow-2xs">
      {/* Table Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 p-5 max-md:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
            <ListFilter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-900">Recent errors</h3>
            <p className="text-xs text-ink-500">
              Latest failures, rate limits and gateway errors from batch jobs
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-ink-400 max-md:hidden">
          Showing latest {recentErrors.length > 0 ? recentErrors.length : 10}
        </span>
      </div>

      <div className="w-full">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="h-4 w-32 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-36 animate-pulse rounded bg-ink-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-ink-100" />
                <div className="h-4 flex-1 animate-pulse rounded bg-ink-100" />
              </div>
            ))}
          </div>
        ) : recentErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-2 text-sm font-semibold text-ink-900">
              No errors recorded
            </p>
            <p className="mt-0.5 text-xs text-ink-400">
              Batch jobs logged no failures, rate limits or gateway errors in this period.
            </p>
          </div>
        ) : isPhone ? (
          <>
            <ul className="divide-y divide-ink-100">
              {shownErrors.map((err) => {
                const isOpen = openError === err.id;
                return (
                  <li key={err.id} className="px-4 py-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-ink-800">{err.source || "Batch job / Generation"}</p>
                      <span className="shrink-0">{getBadgeForErrorType(err.errorType)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-400">{formatDate(err.timestamp)}</p>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="mt-1.5 w-full rounded-lg bg-ink-50 px-2.5 py-2 text-left text-ink-600"
                      onClick={() => setOpenError(isOpen ? null : err.id)}
                    >
                      <span className={`wrap-anywhere ${isOpen ? "" : "line-clamp-2"}`}>{err.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {recentErrors.length > PHONE_ERRORS && (
              <button
                type="button"
                className="min-h-11 w-full border-t border-ink-100 text-xs font-semibold text-ink-600"
                onClick={() => setShowsAll((value) => !value)}
              >
                {showsAll ? "Show fewer" : `Show all ${recentErrors.length}`}
              </button>
            )}
          </>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader className="bg-ink-50/80">
              <TableRow className="border-b border-ink-200/90 hover:bg-transparent">
                <TableHead className="w-[150px] text-xs font-bold text-ink-600 sm:w-[170px]">
                  Timestamp
                </TableHead>
                <TableHead className="w-[180px] text-xs font-bold text-ink-600 sm:w-[240px]">
                  Component / Job
                </TableHead>
                <TableHead className="w-[110px] text-xs font-bold text-ink-600 sm:w-[130px]">
                  Classification
                </TableHead>
                <TableHead className="text-xs font-bold text-ink-600">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentErrors.map((err) => (
                <TableRow
                  key={err.id}
                  className="border-b border-ink-100 text-xs transition-colors hover:bg-ink-50/70"
                >
                  <TableCell className="font-medium whitespace-nowrap text-ink-600">
                    {formatDate(err.timestamp)}
                  </TableCell>
                  <TableCell className="font-semibold text-ink-800">
                    <div className="truncate" title={err.source || "Batch job / Generation"}>
                      {err.source || "Batch job / Generation"}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getBadgeForErrorType(err.errorType)}
                  </TableCell>
                  <TableCell className="font-normal text-ink-600">
                    <div className="truncate" title={err.message}>
                      {err.message}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
