"use client";

import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { Download, Eye, Search, SlidersHorizontal, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { viewInvoiceRequest } from "@/api/subscription";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useDownloadInvoice } from "@/hooks/mutations/use-download-invoice";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { RecentInvoice } from "@/types/subscription";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// Each status as a coloured dot and a label key; a status outside the list keeps the raw value.
const STATUS: Record<string, { labelKey: "subscription.statusPaid" | "subscription.statusProcessing" | "subscription.statusFailed" | "subscription.statusCancelled"; dot: string; text: string }> = {
  paid: { labelKey: "subscription.statusPaid", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  pending: { labelKey: "subscription.statusProcessing", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  failed: { labelKey: "subscription.statusFailed", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  cancelled: { labelKey: "subscription.statusCancelled", dot: "bg-ink-400", text: "text-ink-500" },
};
const statusOf = (status: string) => STATUS[status] ?? { labelKey: null, dot: "bg-ink-400", text: "text-ink-500" };
const statusLabel = (status: string, t: TFunction) => {
  const meta = STATUS[status];
  return meta ? t(meta.labelKey) : status;
};

// The invoices on show as a CSV file, for the Seller's own bookkeeping.
const exportCsv = (invoices: RecentInvoice[], t: TFunction) => {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    [t("subscription.csvInvoice"), t("subscription.csvPlan"), t("subscription.csvDate"), t("subscription.csvAmount"), t("subscription.csvStatus")],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.planName,
      invoice.invoiceDate.slice(0, 10),
      invoice.totalAmountVnd,
      statusLabel(invoice.status, t),
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.map(quote).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `apcs-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

type RecentInvoicesTableProps = {
  invoices: RecentInvoice[];
};

export const RecentInvoicesTable = ({ invoices }: RecentInvoicesTableProps) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const { mutate: downloadInvoice, isPending, variables } = useDownloadInvoice();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [viewing, setViewing] = useState<string | null>(null);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return invoices.filter(
      (invoice) =>
        (status === "all" || invoice.status === status) &&
        (!term || `${invoice.invoiceNumber} ${invoice.planName}`.toLowerCase().includes(term))
    );
  }, [invoices, query, status]);

  const view = async (invoiceId: string) => {
    setViewing(invoiceId);
    try {
      await viewInvoiceRequest({ invoiceId });
    } catch (error) {
      showToast("error", getErrorMessage(error));
    } finally {
      setViewing(null);
    }
  };

  const renderActions = (invoice: RecentInvoice) => {
    const isDownloadingThisRow = isPending && variables?.invoiceId === invoice.invoiceId;
    return (
      <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={isDownloadingThisRow}
                            onClick={() => downloadInvoice({ invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber })}
                            aria-label={t("subscription.downloadInvoiceAria", { invoiceNumber: invoice.invoiceNumber })}
                          >
                            {isDownloadingThisRow ? <Spinner className="size-4" /> : <Download className="size-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={viewing === invoice.invoiceId}
                            onClick={() => void view(invoice.invoiceId)}
                            aria-label={t("subscription.viewInvoiceAria", { invoiceNumber: invoice.invoiceNumber })}
                          >
                            {viewing === invoice.invoiceId ? <Spinner className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                        </div>
    );
  };

  return (
    <Card className="gap-0 rounded-2xl p-0 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4 max-md:px-4">
        <div>
          <h2 className="text-lg font-semibold">{t("subscription.billingHistory")}</h2>
          <p className="text-muted-foreground text-xs max-md:hidden">{t("subscription.recentInvoicesDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:flex-nowrap">
          <div className="relative max-md:min-w-0 max-md:flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("subscription.searchPlaceholder")}
              aria-label={t("subscription.searchAria")}
              className="h-9 w-48 pl-9 max-md:w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 max-md:px-3" aria-label={status === "all" ? t("subscription.filterLabel") : t("subscription.filterWithStatus", { status: statusLabel(status, t) })}>
                <SlidersHorizontal className="size-4" />
                <span className={cn(status === "all" && "max-md:hidden")}>{status === "all" ? t("subscription.filterLabel") : statusLabel(status, t)}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                <DropdownMenuRadioItem value="all">{t("subscription.allStatuses")}</DropdownMenuRadioItem>
                {Object.entries(STATUS).map(([key, item]) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {t(item.labelKey)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-9 max-md:px-3" aria-label={t("subscription.exportLabel")} disabled={shown.length === 0} onClick={() => exportCsv(shown, t)}>
            <Upload className="size-4" />
            <span className="max-md:hidden">{t("subscription.exportLabel")}</span>
          </Button>
        </div>
      </div>

      <div className="px-6 pb-2 max-md:px-4">
        {invoices.length === 0 ? (
          <p className="text-muted-foreground bg-ink-50 rounded-xl px-4 py-8 text-center text-sm">{t("subscription.noInvoices")}</p>
        ) : isPhone ? (
          shown.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">{t("subscription.noInvoicesMatch")}</p>
          ) : (
            <ul className="divide-y">
              {shown.map((invoice) => {
                const label = statusLabel(invoice.status, t);
                const { dot, text } = statusOf(invoice.status);
                return (
                  <li key={invoice.invoiceId} className="space-y-1 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-ink-800 font-medium">{invoice.planName}</span>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", text)}>
                          <span className={cn("size-2 rounded-full", dot)} />
                          {label}
                        </span>
                      </p>
                      <span className="shrink-0 font-semibold tabular-nums">{formatVnd(invoice.totalAmountVnd)}</span>
                    </div>
                    <p className="text-muted-foreground flex justify-between gap-3 text-xs tabular-nums">
                      <span className="min-w-0 truncate">{invoice.invoiceNumber}</span>
                      <span className="shrink-0">{formatDate(invoice.invoiceDate)}</span>
                    </p>
                    {renderActions(invoice)}
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-ink-50 font-medium first:rounded-l-lg">{t("subscription.tablePlan")}</TableHead>
                <TableHead className="bg-ink-50 font-medium">{t("subscription.tableAmount")}</TableHead>
                <TableHead className="bg-ink-50 font-medium">{t("subscription.tableDate")}</TableHead>
                <TableHead className="bg-ink-50 font-medium">{t("subscription.tableStatus")}</TableHead>
                <TableHead className="bg-ink-50 text-right font-medium last:rounded-r-lg">{t("subscription.tableAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                    {t("subscription.noInvoiceMatches")}
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((invoice) => {
                  const label = statusLabel(invoice.status, t);
                  const { dot, text } = statusOf(invoice.status);
                  return (
                    <TableRow key={invoice.invoiceId}>
                      <TableCell className="py-3.5">
                        <p className="text-ink-800 font-medium">{invoice.planName}</p>
                        <p className="text-muted-foreground text-xs">{invoice.invoiceNumber}</p>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatVnd(invoice.totalAmountVnd)}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", text)}>
                          <span className={cn("size-2 rounded-full", dot)} />
                          {label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {renderActions(invoice)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-muted-foreground border-t px-6 py-4 text-xs max-md:px-4">
        {t("subscription.payosNote")}
      </p>
    </Card>
  );
};
