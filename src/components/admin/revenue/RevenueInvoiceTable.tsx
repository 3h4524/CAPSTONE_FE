"use client";

import React from "react";
import { ChevronLeft, ChevronRight,Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RevenueInvoiceDto } from "@/types/revenue";

interface RevenueInvoiceTableProps {
  data?: {
    items: RevenueInvoiceDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
  };
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onExportClick: () => void;
  isExporting?: boolean;
}

export function RevenueInvoiceTable({ 
  data, 
  isLoading, 
  page, 
  onPageChange,
  onExportClick,
  isExporting
}: RevenueInvoiceTableProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  return (
    <Card className="border-none bg-white shadow-sm dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Billing History</CardTitle>
          <CardDescription>Recent successful transactions</CardDescription>
        </div>
        <Button 
          onClick={onExportClick} 
          size="sm" 
          variant="outline" 
          className="gap-2"
          disabled={isExporting || !data || data.items.length === 0}
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                    <TableCell>
                      <div className="mb-1 h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
                      <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
                    </TableCell>
                    <TableCell><div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                    <TableCell><div className="h-5 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div></TableCell>
                    <TableCell className="text-right"><div className="ml-auto h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div></TableCell>
                  </TableRow>
                ))
              ) : !data || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    No transactions found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{invoice.customerName}</div>
                      <div className="text-xs text-slate-500">{invoice.customerEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-indigo-50 font-normal text-indigo-700 hover:bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {invoice.planName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 font-normal text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Paid
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium">{((page - 1) * data!.pageSize) + 1}</span> to <span className="font-medium">{Math.min(page * data!.pageSize, data!.totalCount)}</span> of <span className="font-medium">{data!.totalCount}</span> results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
