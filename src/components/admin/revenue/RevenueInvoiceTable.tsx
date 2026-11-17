"use client";

import React, { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, Receipt, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlanColor } from "@/helpers/revenue-by-plan";
import {
  formatRangeDate,
  formatTransactionDate,
  getPageItems,
  getTransactionStatusStyle,
  TRANSACTION_STATUSES,
} from "@/helpers/revenue-transactions";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { RevenueInvoiceDto, TransactionStatus } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

export interface TransactionTableFilter {
  search: string;
  plan: string;
  status: TransactionStatus | "";
}

interface RevenueInvoiceTableProps {
  data?: {
    items: RevenueInvoiceDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
  };
  isLoading: boolean;
  startDate: string;
  endDate: string;
  planOptions: string[];
  tableFilter: TransactionTableFilter;
  onTableFilterChange: (filter: TransactionTableFilter) => void;
  page: number;
  onPageChange: (page: number) => void;
}

const ALL_FILTER = "all";
const FILTER_TRIGGER_CLASS = "h-9 rounded-lg text-xs font-medium max-md:w-full max-md:min-w-0 max-md:text-base max-md:font-normal";

const STATUS_I18N_KEYS: Record<TransactionStatus, string> = {
  paid: "admin.revenue.invoiceTable.status.paid",
  pending: "admin.revenue.invoiceTable.status.pending",
  overdue: "admin.revenue.invoiceTable.status.overdue",
  refunded: "admin.revenue.invoiceTable.status.refunded",
  cancelled: "admin.revenue.invoiceTable.status.cancelled",
  draft: "admin.revenue.invoiceTable.status.draft",
};

export function RevenueInvoiceTable({
  data,
  isLoading,
  startDate,
  endDate,
  planOptions,
  tableFilter,
  onTableFilterChange,
  page,
  onPageChange,
}: RevenueInvoiceTableProps) {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const statusLabel = (status: string) => STATUS_I18N_KEYS[status as TransactionStatus] ? t(STATUS_I18N_KEYS[status as TransactionStatus]) : getTransactionStatusStyle(status).label;
  const [searchInput, setSearchInput] = useState(tableFilter.search);
  const [selected, setSelected] = useState<RevenueInvoiceDto | null>(null);

  // Debounce typing so every keystroke does not hit the API.
  useEffect(() => {
    if (searchInput === tableFilter.search) return;
    const timer = setTimeout(() => onTableFilterChange({ ...tableFilter, search: searchInput.trim() }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, tableFilter, onTableFilterChange]);

  const totalCount = data?.totalCount ?? 0;
  const pageSize = data?.pageSize ?? 5;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, totalCount);

  return (
    <Card className="border-ink-200/80 bg-card flex h-full flex-col rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md max-md:p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header + toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="text-ink-900 text-sm font-bold whitespace-nowrap dark:text-slate-100">{t("admin.revenue.invoiceTable.title")}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
          <div className="relative w-full max-md:col-span-2 sm:w-72">
            <Search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={isPhone ? t("admin.revenue.invoiceTable.searchTransactions") : t("admin.revenue.invoiceTable.searchPlaceholder")}
              aria-label={t("admin.revenue.invoiceTable.searchTransactions")}
              className="border-ink-200 bg-card text-ink-700 placeholder:text-ink-400 h-9 w-full rounded-lg border pr-3 pl-8 text-xs focus:border-blue-400 focus:outline-none max-md:text-base dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <Select
            value={tableFilter.plan || ALL_FILTER}
            onValueChange={(value) => onTableFilterChange({ ...tableFilter, plan: value === ALL_FILTER ? "" : value })}
          >
            <SelectTrigger aria-label={t("admin.revenue.invoiceTable.filterPlanAria")} className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{t("admin.revenue.invoiceTable.allPlans")}</SelectItem>
              {planOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tableFilter.status || ALL_FILTER}
            onValueChange={(value) => onTableFilterChange({ ...tableFilter, status: value === ALL_FILTER ? "" : (value as TransactionStatus) })}
          >
            <SelectTrigger aria-label={t("admin.revenue.invoiceTable.filterStatusAria")} className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{t("admin.revenue.invoiceTable.allStatus")}</SelectItem>
              {TRANSACTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            title={t("admin.revenue.invoiceTable.periodHint")}
            className="border-ink-200 text-ink-600 flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs whitespace-nowrap max-md:hidden dark:border-slate-800 dark:text-slate-300"
          >
            <Calendar className="text-ink-400 size-3.5" />
            {formatRangeDate(startDate)} – {formatRangeDate(endDate)}
          </div>
        </div>
      </div>

      {/* Table */}
      {isPhone ? (
        isLoading ? (
          <p className="text-ink-400 py-8 text-center text-sm">{t("admin.revenue.invoiceTable.loading")}</p>
        ) : !data || data.items.length === 0 ? (
          <p className="text-ink-400 py-8 text-center text-sm">{t("admin.revenue.invoiceTable.empty")}</p>
        ) : (
          <ul className="divide-ink-100 divide-y dark:divide-slate-800">
            {data.items.map((invoice) => {
              const status = getTransactionStatusStyle(invoice.status);
              const planColor = getPlanColor(invoice.planName);
              return (
                <li key={invoice.id} className="space-y-1.5 py-3 text-xs tabular-nums">
                  <p className="text-ink-700 font-medium dark:text-slate-200">{invoice.invoiceNumber}</p>
                  <div>
                    <p className="text-ink-900 font-semibold dark:text-slate-100">{invoice.customerName}</p>
                    <p className="text-ink-400 truncate text-[11px]">{invoice.customerEmail}</p>
                  </div>
                  <p className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${planColor}1a`, color: planColor }}>
                      {invoice.planName}
                    </span>
                    <span className="text-ink-900 font-semibold dark:text-slate-100">{formatVnd(invoice.amount)}</span>
                  </p>
                  <p className="text-ink-500 flex items-center justify-between gap-2 dark:text-slate-400">
                    <span>{invoice.paymentMethod ?? "—"}</span>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}>{statusLabel(invoice.status)}</span>
                  </p>
                  <div className="text-ink-500 flex items-center justify-between gap-2 dark:text-slate-400">
                    <span>{formatTransactionDate(invoice.paymentDate, invoice.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => setSelected(invoice)}
                      className="border-ink-200 text-ink-600 inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-md border px-3 text-[11px] font-medium dark:border-slate-800 dark:text-slate-300"
                    >
                      <Eye className="size-3" />
                      {t("admin.revenue.invoiceTable.view")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs tabular-nums">
          <thead>
            <tr className="border-ink-100 text-ink-500 border-b text-left text-[11px] font-semibold dark:border-slate-800 dark:text-slate-400">
              <th className="py-2.5 pr-3 font-semibold">{t("admin.revenue.invoiceTable.columns.invoiceNo")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("admin.revenue.invoiceTable.columns.customer")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("admin.revenue.invoiceTable.columns.plan")}</th>
              <th className="px-3 py-2.5 text-right font-semibold">{t("admin.revenue.invoiceTable.columns.amount")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("admin.revenue.invoiceTable.columns.paymentMethod")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("admin.revenue.invoiceTable.columns.status")}</th>
              <th className="px-3 py-2.5 font-semibold">{t("admin.revenue.invoiceTable.columns.date")}</th>
              <th className="py-2.5 pl-3 text-right font-semibold">{t("admin.revenue.invoiceTable.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-ink-100 border-b last:border-0 dark:border-slate-800">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 first:pl-0 last:pr-0">
                      <div className="bg-ink-100 h-3.5 w-full max-w-24 animate-pulse rounded dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-ink-400 h-32 text-center">
                  {t("admin.revenue.invoiceTable.empty")}
                </td>
              </tr>
            ) : (
              data.items.map((invoice) => {
                const status = getTransactionStatusStyle(invoice.status);
                const planColor = getPlanColor(invoice.planName);
                return (
                  <tr
                    key={invoice.id}
                    className="border-ink-100 hover:bg-ink-50/70 border-b transition-colors last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="text-ink-700 py-3 pr-3 font-medium whitespace-nowrap dark:text-slate-200">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-ink-900 font-semibold whitespace-nowrap dark:text-slate-100">
                        {invoice.customerName}
                      </div>
                      <div className="text-ink-400 max-w-[180px] truncate text-[11px]">{invoice.customerEmail}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: `${planColor}1a`, color: planColor }}
                      >
                        {invoice.planName}
                      </span>
                    </td>
                    <td className="text-ink-900 px-3 py-3 text-right font-semibold whitespace-nowrap dark:text-slate-100">
                      {formatVnd(invoice.amount)}
                    </td>
                    <td className="text-ink-600 px-3 py-3 whitespace-nowrap dark:text-slate-300">
                      {invoice.paymentMethod ?? <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}>
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="text-ink-500 px-3 py-3 whitespace-nowrap dark:text-slate-400">
                      {formatTransactionDate(invoice.paymentDate, invoice.createdAt)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(invoice)}
                        className="border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900 inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors dark:border-slate-700 dark:text-slate-300"
                      >
                        <Eye className="size-3" />
                        {t("admin.revenue.invoiceTable.view")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Footer: count + numbered pager */}
      <div className="border-ink-100 mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <p className="text-ink-500 text-xs">
          {t("admin.revenue.invoiceTable.showingFrom")} <span className="text-ink-700 font-semibold dark:text-slate-200">{firstRow}</span> –{" "}
          <span className="text-ink-700 font-semibold dark:text-slate-200">{lastRow}</span> {t("admin.revenue.invoiceTable.showingOf")}{" "}
          <span className="text-ink-700 font-semibold dark:text-slate-200">{totalCount}</span> {t("admin.revenue.common.transactions")}
        </p>
        {isPhone ? (
          <PhonePager page={page} pageCount={totalPages} onPageChange={onPageChange} label={t("admin.revenue.invoiceTable.transactionsPagesAria")} anchorId="recent-transactions" />
        ) : totalPages > 1 && (
          <nav aria-label={t("admin.revenue.invoiceTable.transactionsPagesAria")} className="flex flex-wrap items-center gap-1">
            <PagerButton label={t("admin.revenue.invoiceTable.previousPage")} disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="size-3.5" />
            </PagerButton>
            {getPageItems(page, totalPages).map((item, i) =>
              item === "…" ? (
                <span key={`gap-${i}`} className="text-ink-400 px-1.5 text-xs">
                  …
                </span>
              ) : (
                <PagerButton
                  key={item}
                  label={t("admin.revenue.invoiceTable.pageNumber", { page: item })}
                  active={item === page}
                  disabled={isLoading}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PagerButton>
              )
            )}
            <PagerButton
              label={t("admin.revenue.invoiceTable.nextPage")}
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </PagerButton>
          </nav>
        )}
      </div>

      <TransactionDetailDialog invoice={selected} onClose={() => setSelected(null)} />
    </Card>
  );
}

function PagerButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 max-md:h-10 max-md:min-w-10 ${
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "border-ink-200 text-ink-600 hover:border-ink-300 hover:text-ink-900 border dark:border-slate-800 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function TransactionDetailDialog({
  invoice,
  onClose,
}: {
  invoice: RevenueInvoiceDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const statusLabel = (status: string) => STATUS_I18N_KEYS[status as TransactionStatus] ? t(STATUS_I18N_KEYS[status as TransactionStatus]) : getTransactionStatusStyle(status).label;
  const status = invoice ? getTransactionStatusStyle(invoice.status) : null;

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {invoice && status && (
          <>
            <DialogHeader>
              <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>{t("admin.revenue.invoiceTable.dialogDescription")}</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.columns.customer")}</dt>
              <dd className="text-right font-medium">{invoice.customerName}</dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.userId")}</dt>
              <dd className="truncate text-right font-mono text-xs" title={invoice.userId}>
                {invoice.userId}
              </dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.email")}</dt>
              <dd className="truncate text-right">{invoice.customerEmail}</dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.columns.plan")}</dt>
              <dd className="text-right font-medium">{invoice.planName}</dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.columns.amount")}</dt>
              <dd className="text-right font-semibold">{formatVnd(invoice.amount)}</dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.paymentMethodDialog")}</dt>
              <dd className="text-right">{invoice.paymentMethod ?? "—"}</dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.columns.status")}</dt>
              <dd className="text-right">
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${status.className}`}>
                  {statusLabel(invoice.status)}
                </span>
              </dd>
              <dt className="text-ink-500">{t("admin.revenue.invoiceTable.columns.date")}</dt>
              <dd className="text-right">{formatTransactionDate(invoice.paymentDate, invoice.createdAt)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
