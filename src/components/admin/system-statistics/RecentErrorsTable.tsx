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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-700/90 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3 text-amber-500/80" />
          Warning
        </span>
      );
    }
    if (lower.includes("failed") || lower.includes("job")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50/70 px-2.5 py-0.5 text-[11px] font-medium text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Job failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50/70 px-2.5 py-0.5 text-[11px] font-medium text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10">
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
    <div className="border-ink-200/80 bg-card w-full overflow-hidden rounded-2xl border shadow-2xs">
      {/* Table Header */}
      <div className="border-ink-100 flex flex-wrap items-center justify-between gap-2 border-b p-5 max-md:p-4">
        <div className="flex items-center gap-3">
          <div className="bg-ink-100 text-ink-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <ListFilter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-ink-900 text-sm font-bold">Recent errors</h3>
            <p className="text-ink-500 text-xs">
              Latest failures, rate limits and gateway errors from batch jobs
            </p>
          </div>
        </div>
        <span className="text-ink-400 text-xs font-medium max-md:hidden">
          Showing latest {recentErrors.length > 0 ? recentErrors.length : 10}
        </span>
      </div>

      <div className="w-full">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="bg-ink-100 h-4 w-32 animate-pulse rounded" />
                <div className="bg-ink-100 h-4 w-36 animate-pulse rounded" />
                <div className="bg-ink-100 h-4 w-20 animate-pulse rounded" />
                <div className="bg-ink-100 h-4 flex-1 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : recentErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="text-ink-900 mt-2 text-sm font-semibold">
              No errors recorded
            </p>
            <p className="text-ink-400 mt-0.5 text-xs">
              Batch jobs logged no failures, rate limits or gateway errors in this period.
            </p>
          </div>
        ) : isPhone ? (
          <>
            <ul className="divide-ink-100 divide-y">
              {shownErrors.map((err) => {
                const isOpen = openError === err.id;
                return (
                  <li key={err.id} className="px-4 py-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-ink-800 min-w-0 truncate font-semibold">{err.source || "Batch job / Generation"}</p>
                      <span className="shrink-0">{getBadgeForErrorType(err.errorType)}</span>
                    </div>
                    <p className="text-ink-400 mt-0.5 text-[11px]">{formatDate(err.timestamp)}</p>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="bg-ink-50 text-ink-600 mt-1.5 w-full rounded-lg px-2.5 py-2 text-left"
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
                className="border-ink-100 text-ink-600 min-h-11 w-full border-t text-xs font-semibold"
                onClick={() => setShowsAll((value) => !value)}
              >
                {showsAll ? "Show fewer" : `Show all ${recentErrors.length}`}
              </button>
            )}
          </>
        ) : (
          <Table className="w-full table-fixed">
            <TableHeader className="bg-ink-50/80">
              <TableRow className="border-ink-200/90 border-b hover:bg-transparent">
                <TableHead className="text-ink-600 w-[150px] text-xs font-bold sm:w-[170px]">
                  Timestamp
                </TableHead>
                <TableHead className="text-ink-600 w-[180px] text-xs font-bold sm:w-[240px]">
                  Component / Job
                </TableHead>
                <TableHead className="text-ink-600 w-[110px] text-xs font-bold sm:w-[130px]">
                  Classification
                </TableHead>
                <TableHead className="text-ink-600 text-xs font-bold">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentErrors.map((err) => (
                <TableRow
                  key={err.id}
                  className="border-ink-100 hover:bg-ink-50/70 border-b text-xs transition-colors"
                >
                  <TableCell className="text-ink-600 font-medium whitespace-nowrap">
                    {formatDate(err.timestamp)}
                  </TableCell>
                  <TableCell className="text-ink-800 font-semibold">
                    <div className="truncate" title={err.source || "Batch job / Generation"}>
                      {err.source || "Batch job / Generation"}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getBadgeForErrorType(err.errorType)}
                  </TableCell>
                  <TableCell className="text-ink-600 font-normal">
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
