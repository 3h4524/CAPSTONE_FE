"use client";

import { useMemo, useState } from "react";
import { Download, Eye, Search, SlidersHorizontal, Upload } from "lucide-react";

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
import type { RecentInvoice } from "@/types/subscription";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// Each status as a coloured dot and a word.
const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  paid: { label: "Paid", dot: "bg-emerald-500", text: "text-emerald-600" },
  pending: { label: "Processing", dot: "bg-orange-500", text: "text-orange-600" },
  failed: { label: "Failed", dot: "bg-rose-500", text: "text-rose-600" },
  cancelled: { label: "Cancelled", dot: "bg-slate-400", text: "text-slate-500" },
};
const statusOf = (status: string) => STATUS[status] ?? { label: status, dot: "bg-slate-400", text: "text-slate-500" };

// The invoices on show as a CSV file, for the Seller's own bookkeeping.
const exportCsv = (invoices: RecentInvoice[]) => {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    ["Invoice", "Plan", "Date", "Amount (VND)", "Status"],
    ...invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.planName,
      invoice.invoiceDate.slice(0, 10),
      invoice.totalAmountVnd,
      statusOf(invoice.status).label,
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

  return (
    <Card className="gap-0 rounded-2xl p-0 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Billing History</h2>
          <p className="text-muted-foreground text-xs">Your latest invoices. Download any of them as a PDF.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              aria-label="Search invoices"
              className="h-9 w-48 pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="size-4" /> {status === "all" ? "Filter" : statusOf(status).label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                {Object.entries(STATUS).map(([key, item]) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {item.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-9" disabled={shown.length === 0} onClick={() => exportCsv(shown)}>
            <Upload className="size-4" /> Export
          </Button>
        </div>
      </div>

      <div className="px-6 pb-2">
        {invoices.length === 0 ? (
          <p className="text-muted-foreground rounded-xl bg-slate-50 px-4 py-8 text-center text-sm">No invoices yet.</p>
        ) : (
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-slate-50 font-medium first:rounded-l-lg">Plan Name</TableHead>
                <TableHead className="bg-slate-50 font-medium">Amount</TableHead>
                <TableHead className="bg-slate-50 font-medium">Invoice Date</TableHead>
                <TableHead className="bg-slate-50 font-medium">Status</TableHead>
                <TableHead className="bg-slate-50 text-right font-medium last:rounded-r-lg">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {shown.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                    No invoice matches your search.
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((invoice) => {
                  const isDownloadingThisRow = isPending && variables?.invoiceId === invoice.invoiceId;
                  const { label, dot, text } = statusOf(invoice.status);
                  return (
                    <TableRow key={invoice.invoiceId} className="max-md:grid max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-1 max-md:py-3">
                      <TableCell className="py-3.5 max-md:col-span-2 max-md:p-0 max-md:whitespace-normal">
                        <p className="font-medium text-slate-800">{invoice.planName}</p>
                        <p className="text-muted-foreground text-xs">{invoice.invoiceNumber}</p>
                      </TableCell>
                      <TableCell className="tabular-nums max-md:p-0">{formatVnd(invoice.totalAmountVnd)}</TableCell>
                      <TableCell className="tabular-nums max-md:p-0 max-md:text-right">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell className="max-md:p-0 max-md:whitespace-normal">
                        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", text)}>
                          <span className={cn("size-2 rounded-full", dot)} />
                          {label}
                        </span>
                      </TableCell>
                      <TableCell className="max-md:p-0">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={isDownloadingThisRow}
                            onClick={() => downloadInvoice({ invoiceId: invoice.invoiceId, invoiceNumber: invoice.invoiceNumber })}
                            aria-label={`Download invoice ${invoice.invoiceNumber}`}
                          >
                            {isDownloadingThisRow ? <Spinner className="size-4" /> : <Download className="size-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            disabled={viewing === invoice.invoiceId}
                            onClick={() => void view(invoice.invoiceId)}
                            aria-label={`View invoice ${invoice.invoiceNumber}`}
                          >
                            {viewing === invoice.invoiceId ? <Spinner className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-muted-foreground border-t px-6 py-4 text-xs">
        Payments are processed securely through PayOS. Plan changes take effect once payment is confirmed.
      </p>
    </Card>
  );
};
