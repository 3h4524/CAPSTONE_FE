"use client";

import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Batch } from "@/types/batches";

type BatchListPanelProps = {
  batches: Batch[];
  batchCount: number;
  search: string;
  onSearchChange: (search: string) => void;
  selectedId?: string;
  onSelect: (batch: Batch) => void;
  onEdit: (batch: Batch) => void;
  onDelete: (batch: Batch) => void;
  onAdd: () => void;
};

const humanizeStatus = (status: string) => {
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Every batch beside the open one, on screens with room for a sidebar. */
export const BatchListPanel = ({ batches, batchCount, search, onSearchChange, selectedId, onSelect, onEdit, onDelete, onAdd }: BatchListPanelProps) => {
  const { t } = useTranslation("common");
  return (
  <>
            <div className="space-y-3 border-b p-3">
              <div className="flex items-center justify-between px-1"><h2 className="text-sm font-semibold">{t("batches.list.title")}</h2><span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">{batchCount}</span></div>
              {batchCount > 5 && <div className="relative"><Search className="text-muted-foreground absolute top-2 left-2.5 size-4" /><Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={t("batches.list.search")} className="h-8 pl-8 text-sm" aria-label={t("batches.list.search")} /></div>}
            </div>
            <ul className="max-h-104 min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:max-h-none">
              {batches.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center text-sm">{t("batches.list.noMatch", { search })}</li>}
              {batches.map((batch) => {
                const active = selectedId === batch.id;
                return <li key={batch.id} className={`group/batch relative rounded-lg border transition-colors ${active ? "border-primary/40 bg-primary/5" : "hover:bg-muted/60 border-transparent"}`}>
                  <button type="button" onClick={() => onSelect(batch)} aria-current={active ? "true" : undefined} className="focus-visible:ring-ring w-full rounded-lg py-2.5 pr-10 pl-3 text-left focus-visible:ring-2 focus-visible:outline-none">
                    <div className="flex items-center gap-2"><h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{batch.name}</h3><StatusBadge status={batch.status} className="shrink-0 px-2 py-0 text-[11px]">{t(`batches.statuses.${batch.status.toLowerCase()}`, { defaultValue: humanizeStatus(batch.status) })}</StatusBadge></div>
                    <div className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-xs"><span className="shrink-0"><span className="text-foreground font-medium tabular-nums">{batch.productCount}</span> {t("batches.productCount", { count: batch.productCount })}</span>{batch.defaultNiche && <><span aria-hidden>·</span><span className="truncate"><span className="sr-only">{t("batches.list.defaultNiche")} </span>{batch.defaultNiche}</span></>}</div>
                  </button>
                  <div className="absolute top-1.5 right-1.5"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className={`text-muted-foreground size-7 transition-opacity ${active ? "" : "lg:opacity-0 lg:group-hover/batch:opacity-100 lg:focus-visible:opacity-100 lg:data-[state=open]:opacity-100"}`} aria-label={t("batches.actionsFor", { name: batch.name })}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onEdit(batch)}><Pencil />{t("batches.editBatch")}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => onDelete(batch)}><Trash2 />{t("batches.deleteBatch")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
                </li>;
              })}
            </ul>
            <div className="border-t p-2"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-full justify-start" onClick={onAdd}><Plus className="mr-2 size-4" />{t("batches.list.addAnother")}</Button></div>
  </>
  );
};
