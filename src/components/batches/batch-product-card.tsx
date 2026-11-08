"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/batches";

const VISIBLE_KEYWORDS = 2;

type BatchProductCardProps = {
  product: Product;
  typeLabel: string;
  statusLabel: string;
  isBusy: boolean;
  /** Only a pending product can change; these are left out otherwise. */
  onEdit?: () => void;
  onDelete?: () => void;
  onReset?: () => void;
};

/** One product on the phone, where a table has no room for its niche and keywords. */
export const BatchProductCard = ({ product, typeLabel, statusLabel, isBusy, onEdit, onDelete, onReset }: BatchProductCardProps) => {
  const extraKeywords = product.keywords.length - VISIBLE_KEYWORDS;

  return (
    <li className="bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="min-w-0 text-sm font-semibold wrap-anywhere">{product.name}</h3>
          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-semibold">{typeLabel}</span>
        </div>
        <StatusBadge status={product.status} className="shrink-0">
          {statusLabel}
        </StatusBadge>
      </div>

      {product.productDescription && <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">{product.productDescription}</p>}

      {product.niche && (
        <p className="bg-muted/60 mt-2 inline-block max-w-full rounded-md px-2 py-1 text-xs">
          <span className="text-muted-foreground mr-1.5 text-[10px] font-semibold uppercase">Niche</span>
          {product.niche}
        </p>
      )}

      {product.customPrompt && <p className="text-muted-foreground mt-1.5 text-xs">Own image prompt</p>}

      {(product.keywords.length > 0 || onEdit || onDelete || onReset) && (
        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-1" title={product.keywords.join(", ")}>
            {product.keywords.slice(0, VISIBLE_KEYWORDS).map((keyword) => (
              <span key={keyword} className="bg-muted min-w-0 truncate rounded px-1.5 py-0.5 text-xs">
                {keyword}
              </span>
            ))}
            {extraKeywords > 0 && <span className="text-muted-foreground shrink-0 text-xs">+{extraKeywords}</span>}
          </div>
          {onEdit && (
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${product.name}`} onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="text-muted-foreground size-8" aria-label={`Delete ${product.name}`} disabled={isBusy} onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          )}
          {onReset && (
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" aria-label={`Reset ${product.name} to pending`} disabled={isBusy} onClick={onReset}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
      )}
    </li>
  );
};
