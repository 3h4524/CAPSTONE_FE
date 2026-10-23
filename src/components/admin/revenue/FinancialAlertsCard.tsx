"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CircleCheck,
  Layers,
  TrendingDown,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  countUnseenUrgent,
  isUnseenAlert,
  isUrgentAlert,
  loadSeenAlerts,
  markAlertsSeen,
  saveSeenAlerts,
  type SeenAlerts,
} from "@/helpers/financial-alerts-seen";
import { useAuthStore } from "@/stores/auth";
import type { FinancialAlertDto, TransactionStatus } from "@/types/revenue";
import { formatCurrency } from "@/utils/format-currency";

interface FinancialAlertsCardProps {
  alerts?: FinancialAlertDto[];
  isLoading?: boolean;
  currency?: "VND" | "USD";
  /** Filters the transaction table by a status and brings it into view. */
  onReview?: (status: TransactionStatus) => void;
}

const VISIBLE_ALERTS = 4;

const ALERT_STYLE: Record<
  FinancialAlertDto["type"],
  { icon: React.ElementType; badge: string; title: string }
> = {
  danger: {
    icon: TrendingDown,
    badge: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
    title: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    badge: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    title: "text-amber-600 dark:text-amber-400",
  },
  purple: {
    icon: Layers,
    badge: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    title: "text-purple-600 dark:text-purple-400",
  },
  info: {
    icon: CalendarClock,
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    title: "text-blue-600 dark:text-blue-400",
  },
  success: {
    icon: CircleCheck,
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    title: "text-emerald-600 dark:text-emerald-400",
  },
};

export function FinancialAlertsCard({
  alerts,
  isLoading,
  currency = "VND",
  onReview,
}: FinancialAlertsCardProps) {
  const [showAll, setShowAll] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);
  // null until read from storage, so the badge never flashes for alerts already seen.
  const [seen, setSeen] = useState<SeenAlerts | null>(null);
  // The alerts that were new when the dialog opened; opening it marks everything seen.
  const [newInDialog, setNewInDialog] = useState<Set<string>>(new Set());
  const list = alerts ?? [];
  const unseenCount = seen ? countUnseenUrgent(list, seen) : 0;
  const isNew = (alert: FinancialAlertDto) => seen !== null && isUrgentAlert(alert) && isUnseenAlert(alert, seen);

  useEffect(() => {
    if (userId) setSeen(loadSeenAlerts(userId));
  }, [userId]);

  const openAll = () => {
    setNewInDialog(new Set(list.filter(isNew).map((a) => a.id)));
    setShowAll(true);
    const next = markAlertsSeen(list);
    setSeen(next);
    if (userId) saveSeenAlerts(userId, next);
  };

  const review = (status: TransactionStatus) => {
    setShowAll(false);
    onReview?.(status);
  };

  return (
    <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Bell className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Financial Alerts</h3>
          {unseenCount > 0 && (
            <span
              title={`${unseenCount} new alert${unseenCount === 1 ? "" : "s"} — open View all to mark as read`}
              className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white"
            >
              {unseenCount} new
            </span>
          )}
        </div>

        {list.length > 0 && (
          <button
            type="button"
            onClick={openAll}
            className="cursor-pointer text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            View all ({list.length})
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {isLoading ? (
          Array.from({ length: VISIBLE_ALERTS }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No alert data for this period.</p>
        ) : (
          list
            .slice(0, VISIBLE_ALERTS)
            .map((alert) => (
              <AlertItem key={alert.id} alert={alert} isNew={isNew(alert)} currency={currency} onReview={review} />
            ))
        )}
      </div>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Financial Alerts</DialogTitle>
            <DialogDescription>
              Every alert raised for the selected period, most urgent first. New ones are marked with a dot.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            {list.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                isNew={newInDialog.has(alert.id)}
                currency={currency}
                onReview={review}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AlertItem({
  alert,
  isNew = false,
  currency,
  onReview,
}: {
  alert: FinancialAlertDto;
  isNew?: boolean;
  currency: "VND" | "USD";
  onReview: (status: TransactionStatus) => void;
}) {
  const style = ALERT_STYLE[alert.type] ?? ALERT_STYLE.info;
  const Icon = style.icon;

  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className={`flex items-center gap-1.5 text-xs leading-tight font-bold ${style.title}`}>
            {isNew && <span aria-label="New" className="size-1.5 shrink-0 rounded-full bg-rose-500" />}
            {alert.title}
          </h4>
          <span className="shrink-0 text-[10px] font-medium text-slate-400 dark:text-slate-500">{alert.scope}</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{alert.description}</p>
        {(alert.amount != null || alert.actionStatus) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            {alert.amount != null ? (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {formatCurrency(alert.amount, currency)}
                </span>{" "}
                {alert.amountLabel}
              </span>
            ) : (
              <span />
            )}
            {alert.actionStatus && (
              <button
                type="button"
                onClick={() => onReview(alert.actionStatus!)}
                className="flex shrink-0 cursor-pointer items-center gap-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Review
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
