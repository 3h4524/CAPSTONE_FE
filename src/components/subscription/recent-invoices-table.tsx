import Link from "next/link";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
                  <TableHead className="bg-muted/60 last:rounded-r-md">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
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
                  </TableRow>
                ))}
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
