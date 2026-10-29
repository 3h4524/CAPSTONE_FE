"use client";

import React, { useEffect, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Eye, Receipt, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPlanColor } from "@/helpers/revenue-by-plan";
import {
  formatRangeDate,
  formatTransactionDate,
  getPageItems,
  getTransactionStatusStyle,
  TRANSACTION_STATUS_STYLE,
  TRANSACTION_STATUSES,
} from "@/helpers/revenue-transactions";
import type { RevenueInvoiceDto, TransactionStatus } from "@/types/revenue";
import { formatCurrency } from "@/utils/format-currency";

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
  currency?: "VND" | "USD";
  startDate: string;
  endDate: string;
  planOptions: string[];
  tableFilter: TransactionTableFilter;
  onTableFilterChange: (filter: TransactionTableFilter) => void;
  page: number;
  onPageChange: (page: number) => void;
}

const SELECT_CLASS =
  "h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 focus:border-blue-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

export function RevenueInvoiceTable({
  data,
  isLoading,
  currency = "VND",
  startDate,
  endDate,
  planOptions,
  tableFilter,
  onTableFilterChange,
  page,
  onPageChange,
}: RevenueInvoiceTableProps) {
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
    <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Header + toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Receipt className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold whitespace-nowrap text-slate-900 dark:text-slate-100">Recent Transactions</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search invoice, customer, email or user ID..."
              aria-label="Search transactions"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="relative">
            <select
              aria-label="Filter by plan"
              value={tableFilter.plan}
              onChange={(e) => onTableFilterChange({ ...tableFilter, plan: e.target.value })}
              className={SELECT_CLASS}
            >
              <option value="">All Plans</option>
              {planOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select
              aria-label="Filter by status"
              value={tableFilter.status}
              onChange={(e) => onTableFilterChange({ ...tableFilter, status: e.target.value as TransactionStatus | "" })}
              className={SELECT_CLASS}
            >
              <option value="">All Status</option>
              {TRANSACTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TRANSACTION_STATUS_STYLE[s].label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <div
            title="Change the period with the date filter at the top of the page"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs whitespace-nowrap text-slate-600 dark:border-slate-800 dark:text-slate-300"
          >
            <Calendar className="size-3.5 text-slate-400" />
            {formatRangeDate(startDate)} – {formatRangeDate(endDate)}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-2.5 pr-3 font-semibold">Invoice No.</th>
              <th className="px-3 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Plan</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-3 py-2.5 font-semibold">Payment Method</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="py-2.5 pl-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 first:pl-0 last:pr-0">
                      <div className="h-3.5 w-full max-w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="h-32 text-center text-slate-400">
                  No transactions match these filters.
                </td>
              </tr>
            ) : (
              data.items.map((invoice) => {
                const status = getTransactionStatusStyle(invoice.status);
                const planColor = getPlanColor(invoice.planName);
                return (
                  <tr
                    key={invoice.id}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 pr-3 font-medium whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100">
                        {invoice.customerName}
                      </div>
                      <div className="max-w-[180px] truncate text-[11px] text-slate-400">{invoice.customerEmail}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold"
                        style={{ backgroundColor: `${planColor}1a`, color: planColor }}
                      >
                        {invoice.planName}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100">
                      {formatCurrency(invoice.amount, currency)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {invoice.paymentMethod ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {formatTransactionDate(invoice.paymentDate, invoice.createdAt)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(invoice)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300"
                      >
                        <Eye className="size-3" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + numbered pager */}
      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{firstRow}</span> –{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{lastRow}</span> of{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> transactions
        </p>
        {totalPages > 1 && (
          <nav aria-label="Transactions pages" className="flex items-center gap-1">
            <PagerButton label="Previous page" disabled={page <= 1 || isLoading} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="size-3.5" />
            </PagerButton>
            {getPageItems(page, totalPages).map((item, i) =>
              item === "…" ? (
                <span key={`gap-${i}`} className="px-1.5 text-xs text-slate-400">
                  …
                </span>
              ) : (
                <PagerButton
                  key={item}
                  label={`Page ${item}`}
                  active={item === page}
                  disabled={isLoading}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PagerButton>
              )
            )}
            <PagerButton
              label="Next page"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </PagerButton>
          </nav>
        )}
      </div>

      <TransactionDetailDialog invoice={selected} currency={currency} onClose={() => setSelected(null)} />
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
      className={`inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function TransactionDetailDialog({
  invoice,
  currency,
  onClose,
}: {
  invoice: RevenueInvoiceDto | null;
  currency: "VND" | "USD";
  onClose: () => void;
}) {
  const status = invoice ? getTransactionStatusStyle(invoice.status) : null;

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {invoice && status && (
          <>
            <DialogHeader>
              <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>Transaction details</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-slate-500">Customer</dt>
              <dd className="text-right font-medium">{invoice.customerName}</dd>
              <dt className="text-slate-500">User ID</dt>
              <dd className="truncate text-right font-mono text-xs" title={invoice.userId}>
                {invoice.userId}
              </dd>
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate text-right">{invoice.customerEmail}</dd>
              <dt className="text-slate-500">Plan</dt>
              <dd className="text-right font-medium">{invoice.planName}</dd>
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-right font-semibold">{formatCurrency(invoice.amount, currency)}</dd>
              <dt className="text-slate-500">Payment method</dt>
              <dd className="text-right">{invoice.paymentMethod ?? "—"}</dd>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-right">
                <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${status.className}`}>
                  {status.label}
                </span>
              </dd>
              <dt className="text-slate-500">Date</dt>
              <dd className="text-right">{formatTransactionDate(invoice.paymentDate, invoice.createdAt)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
