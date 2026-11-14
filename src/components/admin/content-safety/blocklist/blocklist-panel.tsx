"use client";

import { useDeferredValue, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { AllowlistDialog,type AllowlistDialogTarget } from "@/components/admin/content-safety/blocklist/allowlist-dialog";
import { DIALOG_CLASS, DialogHead } from "@/components/admin/content-safety/blocklist/form-parts";
import { TermDialog,type TermDialogTarget } from "@/components/admin/content-safety/blocklist/term-dialog";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatDateTime,
  PanelMessage,
  Section,
  StorageMissingBanner,
} from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useDeleteModerationAllowlist,
  useDeleteModerationTerm,
  useSaveModerationAllowlist,
  useToggleModerationTerm,
} from "@/hooks/mutations/use-admin-moderation-mutations";
import { useModerationAllowlist, useModerationSettings, useModerationTerms } from "@/hooks/queries/use-admin-moderation";
import { useIsPhone } from "@/hooks/use-is-phone";
import type {
  ModerationAllowlistItem,
  ModerationCategory,
  ModerationTerm,
  ModerationTermFilter,
  ModerationTermSeverity,
} from "@/types/admin-moderation";
import { cn } from "@/utils/cn";

const ALL = "all";
const headClass = "text-ink-500 text-xs font-semibold tracking-wider uppercase";

const SeverityBadge = ({ severity }: { severity: ModerationTermSeverity }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
      severity === "block"
        ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30"
        : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"
    )}
  >
    {severity === "block" ? "Block" : "Flag"}
  </span>
);

type DeleteTarget = { kind: "term"; item: ModerationTerm } | { kind: "allowlist"; item: ModerationAllowlistItem } | null;

const DeleteDialog = ({ target, onClose }: { target: DeleteTarget; onClose: () => void }) => {
  const deleteTerm = useDeleteModerationTerm(onClose);
  const deleteAllowlist = useDeleteModerationAllowlist(onClose);
  const pending = deleteTerm.isPending || deleteAllowlist.isPending;
  const name = target?.kind === "term" ? target.item.term : target?.item.phrase;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className={cn(DIALOG_CLASS, "max-w-[440px]")}>
        <DialogHead
          icon={Trash2}
          eyebrow={target?.kind === "term" ? "DELETE TERM" : "REMOVE PHRASE"}
          title={`Delete “${name ?? ""}”?`}
          description={
            target?.kind === "term"
              ? "The next check no longer matches it. To stop it for a while instead, pause it."
              : "Text containing it is matched by the blocklist again from the next check."
          }
          onClose={onClose}
        />
        <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() =>
              target?.kind === "term" ? deleteTerm.mutate(target.item.id) : target && deleteAllowlist.mutate(target.item.id)
            }
          >
            {pending && <Spinner className="size-4" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TermFilters = ({
  search,
  onSearch,
  filter,
  onFilter,
}: {
  search: string;
  onSearch: (value: string) => void;
  filter: ModerationTermFilter;
  onFilter: (filter: ModerationTermFilter) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    <div className="relative min-w-52 flex-1">
      <Search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
      <Input
        type="search"
        aria-label="Search terms"
        placeholder="Search terms"
        className="pl-9"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
    </div>
    <Select
      value={filter.category ?? ALL}
      onValueChange={(value) => onFilter({ ...filter, category: value === ALL ? undefined : (value as ModerationCategory) })}
    >
      <SelectTrigger className="w-44" aria-label="Category">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All categories</SelectItem>
        {CATEGORY_ORDER.map((category) => (
          <SelectItem key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={filter.severity ?? ALL}
      onValueChange={(value) => onFilter({ ...filter, severity: value === ALL ? undefined : (value as ModerationTermSeverity) })}
    >
      <SelectTrigger className="w-36" aria-label="Severity">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Block and flag</SelectItem>
        <SelectItem value="block">Block</SelectItem>
        <SelectItem value="flag">Flag</SelectItem>
      </SelectContent>
    </Select>
    <Select
      value={filter.active === undefined ? ALL : String(filter.active)}
      onValueChange={(value) => onFilter({ ...filter, active: value === ALL ? undefined : value === "true" })}
    >
      <SelectTrigger className="w-36" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Any status</SelectItem>
        <SelectItem value="true">Active</SelectItem>
        <SelectItem value="false">Paused</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export const BlocklistPanel = () => {
  const isPhone = useIsPhone();
  const settings = useModerationSettings();
  const storageReady = settings.data?.storageReady ?? true;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [filter, setFilter] = useState<ModerationTermFilter>({});
  const terms = useModerationTerms({ ...filter, search: deferredSearch || undefined });
  const allowlist = useModerationAllowlist();
  const toggleTerm = useToggleModerationTerm();
  const toggleAllowlist = useSaveModerationAllowlist();
  const [termTarget, setTermTarget] = useState<TermDialogTarget>(null);
  const [allowTarget, setAllowTarget] = useState<AllowlistDialogTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const setTermActive = (term: ModerationTerm, isActive: boolean) =>
    toggleTerm.mutate({
      id: term.id,
      input: {
        term: term.term,
        category: term.category,
        severity: term.severity,
        matchType: term.matchType,
        matchUnaccented: term.matchUnaccented,
        language: term.language,
        isActive,
        note: term.note,
      },
    });

  const termActions = (term: ModerationTerm) => (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hover:translate-y-0"
        aria-label={`Edit ${term.term}`}
        disabled={!storageReady}
        onClick={() => setTermTarget({ term })}
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-rose-600 hover:translate-y-0 hover:bg-rose-50 dark:hover:bg-rose-500/10"
        aria-label={`Delete ${term.term}`}
        disabled={!storageReady}
        onClick={() => setDeleteTarget({ kind: "term", item: term })}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      {!storageReady && <StorageMissingBanner />}

      <Section
        title="Blocklist terms"
        description="Checked before Gemini on every seller text. A change applies to the next check."
        actions={
          <Button type="button" size="sm" disabled={!storageReady} onClick={() => setTermTarget({ create: true })}>
            <Plus aria-hidden="true" />
            Add term
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TermFilters search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
          {terms.isError ? (
            <PanelMessage tone="error" title="The blocklist could not be loaded." />
          ) : !terms.data ? (
            <Skeleton className="h-48 w-full" />
          ) : terms.data.length === 0 ? (
            <PanelMessage
              title={search || Object.keys(filter).some((key) => filter[key as keyof ModerationTermFilter] !== undefined) ? "No term matches these filters." : "The blocklist is empty."}
              description="Add a word or phrase to block or flag it in seller text."
            />
          ) : isPhone ? (
            <ul className="space-y-2">
              {terms.data.map((term) => (
                <li key={term.id} className="border-ink-200 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-ink-900 dark:text-ink-50 truncate font-semibold">{term.term}</p>
                      <p className="text-ink-500 mt-0.5 text-xs">
                        {CATEGORY_LABELS[term.category]} · {term.matchType === "phrase" ? "Phrase" : "Word"}
                        {term.matchUnaccented ? " · also without accents" : ""}
                      </p>
                    </div>
                    <SeverityBadge severity={term.severity} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-ink-600 flex items-center gap-2 text-xs">
                      <Switch
                        checked={term.isActive}
                        disabled={!storageReady || toggleTerm.isPending}
                        onCheckedChange={(checked) => setTermActive(term, checked)}
                        aria-label={`${term.term} active`}
                      />
                      {term.isActive ? "Active" : "Paused"}
                    </label>
                    {termActions(term)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={headClass}>Term</TableHead>
                    <TableHead className={headClass}>Category</TableHead>
                    <TableHead className={headClass}>When it matches</TableHead>
                    <TableHead className={headClass}>Matching</TableHead>
                    <TableHead className={headClass}>Active</TableHead>
                    <TableHead className={headClass}>Updated</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.data.map((term) => (
                    <TableRow key={term.id} className={cn(!term.isActive && "opacity-60")}>
                      <TableCell>
                        <p className="text-ink-900 dark:text-ink-50 font-semibold">{term.term}</p>
                        {term.note ? <p className="text-ink-500 max-w-64 truncate text-xs">{term.note}</p> : null}
                      </TableCell>
                      <TableCell className="text-ink-700">{CATEGORY_LABELS[term.category]}</TableCell>
                      <TableCell>
                        <SeverityBadge severity={term.severity} />
                      </TableCell>
                      <TableCell className="text-ink-600 text-xs">
                        {term.matchType === "phrase" ? "Phrase" : "Whole word"} · {term.language.toUpperCase()}
                        {term.matchUnaccented ? <span className="block">Also without accents</span> : null}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={term.isActive}
                          disabled={!storageReady || toggleTerm.isPending}
                          onCheckedChange={(checked) => setTermActive(term, checked)}
                          aria-label={`${term.term} active`}
                        />
                      </TableCell>
                      <TableCell className="text-ink-500 text-xs">{formatDateTime(term.updatedAt)}</TableCell>
                      <TableCell>
                        {termActions(term)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Allowlist"
        description="Harmless phrases that contain a listed term, such as “naked eye”. They are ignored by the blocklist; Gemini still checks them."
        actions={
          <Button type="button" size="sm" variant="outline" disabled={!storageReady} onClick={() => setAllowTarget({ phrase: "" })}>
            <Plus aria-hidden="true" />
            Add phrase
          </Button>
        }
      >
        {allowlist.isError ? (
          <PanelMessage tone="error" title="The allowlist could not be loaded." />
        ) : !allowlist.data ? (
          <Skeleton className="h-32 w-full" />
        ) : allowlist.data.length === 0 ? (
          <PanelMessage title="No allowlisted phrase yet." description="Add one when a harmless text keeps matching a term." />
        ) : (
          <ul className="divide-ink-100 divide-y">
            {allowlist.data.map((item) => (
              <li key={item.id} className={cn("flex items-center gap-3 py-2.5", !item.isActive && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 dark:text-ink-50 font-medium">{item.phrase}</p>
                  {item.note ? <p className="text-ink-500 truncate text-xs">{item.note}</p> : null}
                </div>
                <Switch
                  checked={item.isActive}
                  disabled={!storageReady || toggleAllowlist.isPending}
                  onCheckedChange={(checked) =>
                    toggleAllowlist.mutate({ id: item.id, input: { phrase: item.phrase, isActive: checked, note: item.note } })
                  }
                  aria-label={`${item.phrase} active`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hover:translate-y-0"
                  aria-label={`Edit ${item.phrase}`}
                  disabled={!storageReady}
                  onClick={() => setAllowTarget({ item })}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-rose-600 hover:translate-y-0 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  aria-label={`Delete ${item.phrase}`}
                  disabled={!storageReady}
                  onClick={() => setDeleteTarget({ kind: "allowlist", item })}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <TermDialog target={termTarget} onClose={() => setTermTarget(null)} />
      <AllowlistDialog target={allowTarget} onClose={() => setAllowTarget(null)} />
      <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
};
