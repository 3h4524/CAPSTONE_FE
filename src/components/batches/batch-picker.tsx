"use client";

import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Batch } from "@/types/batches";

const SEARCH_FROM = 6;

type BatchPickerProps = {
  batches: Batch[];
  selected: Batch;
  onSelect: (batch: Batch) => void;
};

/** Chooses the batch on a phone: says which one is open and how many there are, then drops down the rest. */
export const BatchPicker = ({ batches, selected, onSelect }: BatchPickerProps) => {
  const [query, setQuery] = useState("");
  const matches = batches.filter((batch) => batch.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger className="bg-card focus-visible:ring-ring/40 data-[state=open]:border-primary flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-2 text-left shadow-sm outline-none focus-visible:ring-2">
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground block text-xs">
            Choose a batch · {batches.length} {batches.length === 1 ? "batch" : "batches"}
          </span>
          <span className="block truncate text-sm font-semibold">{selected.name}</span>
        </span>
        <ChevronDown className="text-muted-foreground size-5 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60dvh] w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
        {batches.length >= SEARCH_FROM && (
          <div className="relative p-1">
            <Search className="text-muted-foreground absolute top-3.5 left-3.5 size-4" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // The menu reads typing as jumping between items, which would take the focus away.
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Find a batch"
              aria-label="Find a batch"
              className="pl-9"
            />
          </div>
        )}
        {matches.map((batch) => (
          <DropdownMenuItem key={batch.id} onSelect={() => onSelect(batch)} className="min-h-12 items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{batch.name}</span>
              <span className="text-muted-foreground block text-xs">
                <span className="tabular-nums">{batch.productCount}</span> {batch.productCount === 1 ? "product" : "products"}
              </span>
            </span>
            <StatusBadge status={batch.status} className="shrink-0 px-1.5 py-0 text-[10px] capitalize">
              {batch.status}
            </StatusBadge>
            <Check className={batch.id === selected.id ? "text-primary size-4 shrink-0" : "invisible size-4 shrink-0"} aria-hidden="true" />
          </DropdownMenuItem>
        ))}
        {matches.length === 0 && <p className="text-muted-foreground px-3 py-4 text-center text-sm">No batches match “{query}”.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
