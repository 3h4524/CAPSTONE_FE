import Link from "next/link";
import { Check, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDownloadInvoice } from "@/hooks/mutations/use-download-invoice";
import type { RecentInvoice } from "@/types/subscription";
import { cn } from "@/utils/cn";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const STATUS_BADGE_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  paid: "default",
  failed: "destructive",
  cancelled: "outline",
  pending: "secondary",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  paid: "bg-success-background text-success-text border-transparent",
};

type RecentInvoicesTableProps = {
  invoices: RecentInvoice[];
};

export const RecentInvoicesTable = ({ invoices }: RecentInvoicesTableProps) => {
  const { mutate: downloadInvoice, isPending, variables } = useDownloadInvoice();

  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Billing history
              </p>
              <h2 className="text-lg font-semibold">Recent invoices</h2>
            </div>
            <Link href="/subscription/invoices" className="text-primary text-sm font-medium hover:underline">
              View all invoices →
            </Link>
          </div>

          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-muted/60 first:rounded-l-md">Invoice</TableHead>
                  <TableHead className="bg-muted/60">Date</TableHead>
                  <TableHead className="bg-muted/60">Plan</TableHead>
                  <TableHead className="bg-muted/60">Amount</TableHead>
                  <TableHead className="bg-muted/60">Status</TableHead>
                  <TableHead className="bg-muted/60 last:rounded-r-md" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const isDownloadingThisRow = isPending && variables?.invoiceId === invoice.invoiceId;
                  return (
                    <TableRow key={invoice.invoiceId}>
                      <TableCell className="text-primary font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{invoice.planName}</TableCell>
                      <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE_VARIANT[invoice.status] ?? "secondary"}
                          className={cn(STATUS_BADGE_CLASS[invoice.status])}
                        >
                          {invoice.status === "paid" && <Check className="size-3" />}
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isDownloadingThisRow}
                          onClick={() =>
                            downloadInvoice({
                              invoiceId: invoice.invoiceId,
                              invoiceNumber: invoice.invoiceNumber,
                            })
                          }
                          aria-label={`Download invoice ${invoice.invoiceNumber}`}
                        >
                          {isDownloadingThisRow ? <Spinner className="size-4" /> : <Download className="size-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <p className="text-muted-foreground border-t pt-4 text-xs">
            Payments are processed securely through PayOS. Plan changes take effect once payment is confirmed.
          </p>
        </CardContent>
      </Card>
    </section>
  );
};
