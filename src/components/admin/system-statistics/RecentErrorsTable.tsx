"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SystemErrorLogDto } from "@/types/system-statistics";

interface RecentErrorsTableProps {
  recentErrors?: SystemErrorLogDto[];
  isLoading: boolean;
}

export function RecentErrorsTable({
  recentErrors = [],
  isLoading,
}: RecentErrorsTableProps) {
  const getBadgeForErrorType = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("rate") || lower.includes("limit")) {
      return (
        <span className="inline-flex items-center rounded border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
          Rate Limit
        </span>
      );
    }
    if (lower.includes("oauth") || lower.includes("auth")) {
      return (
        <span className="inline-flex items-center rounded border border-purple-200/80 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-800 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300">
          Auth / Token
        </span>
      );
    }
    if (lower.includes("timeout") || lower.includes("network")) {
      return (
        <span className="inline-flex items-center rounded border border-orange-200/80 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800 dark:border-orange-800/40 dark:bg-orange-950/40 dark:text-orange-300">
          Timeout
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300">
        {type || "Exception"}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <Card className="border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100/80 pb-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Recent Operational Errors
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Audit log of exceptions, rate limits, and external service failures
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Top 10 incidents
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : recentErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
              All Systems Functioning Normally
            </p>
            <p className="mt-1 text-xs text-slate-400">
              No runtime errors, rate limits, or integration exceptions recorded in this timeframe.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/40">
              <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="w-[170px] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Timestamp
                </TableHead>
                <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Component / Job
                </TableHead>
                <TableHead className="w-[130px] text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Classification
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Message
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentErrors.map((err) => (
                <TableRow
                  key={err.id}
                  className="border-b border-slate-100 text-xs transition-colors hover:bg-slate-50/80 dark:border-slate-800/70 dark:hover:bg-slate-800/40"
                >
                  <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {formatDate(err.timestamp)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    <span className="rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                      {err.source || "Batch Engine"}
                    </span>
                  </TableCell>
                  <TableCell>{getBadgeForErrorType(err.errorType)}</TableCell>
                  <TableCell
                    className="max-w-[420px] truncate text-slate-600 dark:text-slate-300"
                    title={err.message}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{err.message}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
