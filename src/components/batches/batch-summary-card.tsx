"use client";

import { formatDistanceToNow } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { CircleHelp, Clock, MoreHorizontal, Package, Pencil, Plus, Tag, Trash2, Upload, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BatchJobHistoryMenu } from "@/components/batches/batch-job-history-menu";
import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Batch } from "@/types/batches";

type BatchSummaryCardProps = {
  batch: Batch;
  pendingProductCount: number;
  hasProducts: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShowHelp: () => void;
  onImport: () => void;
  onAddProduct: () => void;
  onRun: () => void;
};

const humanizeStatus = (status: string) => {
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The chosen batch on the phone: what it is, how to reach another batch, and the next step. */
export const BatchSummaryCard = ({
  batch,
  pendingProductCount,
  hasProducts,
  onEdit,
  onDelete,
  onShowHelp,
  onImport,
  onAddProduct,
  onRun,
}: BatchSummaryCardProps) => {
  const { t, i18n } = useTranslation("common");
  return (
  <div className="bg-card space-y-3 rounded-2xl border p-4 shadow-sm">
    <div className="flex items-center gap-2">
      <StatusBadge status={batch.status} className="shrink-0">
        {t(`batches.statuses.${batch.status.toLowerCase()}`, { defaultValue: humanizeStatus(batch.status) })}
      </StatusBadge>
      <span className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 text-xs">
        <Clock className="size-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true, locale: i18n.language === "vi" ? viLocale : undefined })}</span>
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground -my-1 size-8" aria-label={t("batches.actionsFor", { name: batch.name })}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {t("batches.editBatch")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShowHelp}>
            <CircleHelp />
            {t("batches.summary.howItWorks")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            {t("batches.deleteBatch")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <h2 className="text-lg leading-snug font-semibold tracking-tight wrap-anywhere">{batch.name}</h2>

    {batch.description && <p className="text-muted-foreground line-clamp-2 text-sm">{batch.description}</p>}

    <div className="flex flex-wrap gap-2 text-xs">
      <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5">
        <Package className="text-muted-foreground size-3.5" aria-hidden="true" />
        <span className="font-semibold tabular-nums">{batch.productCount}</span> {t("batches.productCount", { count: batch.productCount })}
      </span>
      {batch.defaultNiche && (
        <span className="bg-muted/60 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5">
          <Tag className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{batch.defaultNiche}</span>
        </span>
      )}
    </div>

    {pendingProductCount > 0 && (
      <Button className="w-full" onClick={onRun}>
        <Workflow className="size-4" aria-hidden="true" />
        {t("batches.summary.runInWorkflow", { count: pendingProductCount })}
      </Button>
    )}

    {/* While the batch is empty, the empty state offers these same two actions. */}
    {hasProducts && (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="px-2" onClick={onImport}>
          <Upload className="size-4" aria-hidden="true" />
          {t("batches.importExcel")}
        </Button>
        <Button variant="outline" className="px-2" onClick={onAddProduct}>
          <Plus className="size-4" aria-hidden="true" />
          {t("batches.addProduct")}
        </Button>
      </div>
    )}

    <div className="empty:hidden [&_button]:w-full">
      <BatchJobHistoryMenu batchId={batch.id} />
    </div>
  </div>
  );
};
