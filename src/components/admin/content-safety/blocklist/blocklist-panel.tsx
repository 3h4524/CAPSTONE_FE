"use client";

import { useDeferredValue, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AllowlistDialog,type AllowlistDialogTarget } from "@/components/admin/content-safety/blocklist/allowlist-dialog";
import { DIALOG_CLASS, DialogHead } from "@/components/admin/content-safety/blocklist/form-parts";
import { TermDialog,type TermDialogTarget } from "@/components/admin/content-safety/blocklist/term-dialog";
import {
  CATEGORY_LABEL_KEYS,
  CATEGORY_ORDER,
  formatDateTime,
  formatNumber,
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
const PAGE_SIZE = 20;
const headClass = "text-ink-500 text-xs font-semibold tracking-wider uppercase";

const SeverityBadge = ({ severity }: { severity: ModerationTermSeverity }) => {
  const { t } = useTranslation("common");
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        severity === "block"
          ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30"
          : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"
      )}
    >
      {t(severity === "block" ? "admin.contentSafety.severity.block" : "admin.contentSafety.severity.flag")}
    </span>
  );
};

type DeleteTarget = { kind: "term"; item: ModerationTerm } | { kind: "allowlist"; item: ModerationAllowlistItem } | null;

const DeleteDialog = ({ target, onClose }: { target: DeleteTarget; onClose: () => void }) => {
  const { t } = useTranslation("common");
  const deleteTerm = useDeleteModerationTerm(onClose);
  const deleteAllowlist = useDeleteModerationAllowlist(onClose);
  const pending = deleteTerm.isPending || deleteAllowlist.isPending;
  const name = target?.kind === "term" ? target.item.term : target?.item.phrase;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className={cn(DIALOG_CLASS, "max-w-[440px]")}>
        <DialogHead
          icon={Trash2}
          eyebrow={t(
            target?.kind === "term"
              ? "admin.contentSafety.deleteDialog.eyebrowTerm"
              : "admin.contentSafety.deleteDialog.eyebrowAllowlist"
          )}
          title={t("admin.contentSafety.deleteDialog.title", { name: name ?? "" })}
          description={t(
            target?.kind === "term" ? "admin.contentSafety.deleteDialog.descTerm" : "admin.contentSafety.deleteDialog.descAllowlist"
          )}
          onClose={onClose}
        />
        <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.contentSafety.common.cancel")}
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
            {t("admin.contentSafety.common.delete")}
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
}) => {
  const { t } = useTranslation("common");
  return (
  <div className="flex flex-wrap gap-2">
    <div className="relative min-w-52 flex-1">
      <Search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
      <Input
        type="search"
        aria-label={t("admin.contentSafety.blocklist.search")}
        placeholder={t("admin.contentSafety.blocklist.search")}
        className="pl-9"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
    </div>
    <Select
      value={filter.category ?? ALL}
      onValueChange={(value) => onFilter({ ...filter, category: value === ALL ? undefined : (value as ModerationCategory) })}
    >
      <SelectTrigger className="w-44" aria-label={t("admin.contentSafety.common.category")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("admin.contentSafety.common.allCategories")}</SelectItem>
        {CATEGORY_ORDER.map((category) => (
          <SelectItem key={category} value={category}>
            {t(CATEGORY_LABEL_KEYS[category])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select
      value={filter.severity ?? ALL}
      onValueChange={(value) => onFilter({ ...filter, severity: value === ALL ? undefined : (value as ModerationTermSeverity) })}
    >
      <SelectTrigger className="w-36" aria-label={t("admin.contentSafety.common.severity")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("admin.contentSafety.severity.blockAndFlag")}</SelectItem>
        <SelectItem value="block">{t("admin.contentSafety.severity.block")}</SelectItem>
        <SelectItem value="flag">{t("admin.contentSafety.severity.flag")}</SelectItem>
      </SelectContent>
    </Select>
    <Select
      value={filter.active === undefined ? ALL : String(filter.active)}
      onValueChange={(value) => onFilter({ ...filter, active: value === ALL ? undefined : value === "true" })}
    >
      <SelectTrigger className="w-36" aria-label={t("admin.contentSafety.common.status")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("admin.contentSafety.common.anyStatus")}</SelectItem>
        <SelectItem value="true">{t("admin.contentSafety.common.active")}</SelectItem>
        <SelectItem value="false">{t("admin.contentSafety.common.paused")}</SelectItem>
      </SelectContent>
    </Select>
  </div>
  );
};

export const BlocklistPanel = () => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const settings = useModerationSettings();
  const storageReady = settings.data?.storageReady ?? true;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [filter, setFilter] = useState<ModerationTermFilter>({});
  const [page, setPage] = useState(1);
  const terms = useModerationTerms({ ...filter, search: deferredSearch || undefined });
  const termList = terms.data ?? [];
  const pageCount = Math.max(1, Math.ceil(termList.length / PAGE_SIZE));
  // A delete or a filter can leave fewer pages than the one being shown.
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleTerms = termList.slice(firstIndex, firstIndex + PAGE_SIZE);
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
        aria-label={t("admin.contentSafety.common.editName", { name: term.term })}
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
        aria-label={t("admin.contentSafety.common.deleteName", { name: term.term })}
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
        title={t("admin.contentSafety.blocklist.title")}
        description={t("admin.contentSafety.blocklist.description")}
        actions={
          <Button type="button" size="sm" disabled={!storageReady} onClick={() => setTermTarget({ create: true })}>
            <Plus aria-hidden="true" />
            {t("admin.contentSafety.common.addTerm")}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TermFilters
            search={search}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            filter={filter}
            onFilter={(next) => {
              setFilter(next);
              setPage(1);
            }}
          />
          {terms.isError ? (
            <PanelMessage tone="error" title={t("admin.contentSafety.blocklist.loadError")} />
          ) : !terms.data ? (
            <Skeleton className="h-48 w-full" />
          ) : terms.data.length === 0 ? (
            <PanelMessage
              title={
                search || Object.keys(filter).some((key) => filter[key as keyof ModerationTermFilter] !== undefined)
                  ? t("admin.contentSafety.blocklist.emptyFiltered")
                  : t("admin.contentSafety.blocklist.empty")
              }
              description={t("admin.contentSafety.blocklist.emptyDescription")}
            />
          ) : isPhone ? (
            <ul className="space-y-2">
              {visibleTerms.map((term) => (
                <li key={term.id} className="border-ink-200 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-ink-900 truncate font-semibold">{term.term}</p>
                      <p className="text-ink-500 mt-0.5 text-xs">
                        {t(CATEGORY_LABEL_KEYS[term.category])} · {t(term.matchType === "phrase" ? "admin.contentSafety.matchType.phrase" : "admin.contentSafety.matchType.wordShort")}
                        {term.matchUnaccented ? ` · ${t("admin.contentSafety.matchType.alsoWithoutAccents")}` : ""}
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
                        aria-label={t("admin.contentSafety.common.nameActive", { name: term.term })}
                      />
                      {t(term.isActive ? "admin.contentSafety.common.active" : "admin.contentSafety.common.paused")}
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
                    <TableHead className={headClass}>{t("admin.contentSafety.blocklist.tableTerm")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.category")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.whenItMatches")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.blocklist.matching")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.active")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.blocklist.tableUpdated")}</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTerms.map((term) => (
                    <TableRow key={term.id} className={cn(!term.isActive && "opacity-60")}>
                      <TableCell>
                        <p className="text-ink-900 font-semibold">{term.term}</p>
                        {term.note ? <p className="text-ink-500 max-w-64 truncate text-xs">{term.note}</p> : null}
                      </TableCell>
                      <TableCell className="text-ink-700">{t(CATEGORY_LABEL_KEYS[term.category])}</TableCell>
                      <TableCell>
                        <SeverityBadge severity={term.severity} />
                      </TableCell>
                      <TableCell className="text-ink-600 text-xs">
                        {t(term.matchType === "phrase" ? "admin.contentSafety.matchType.phrase" : "admin.contentSafety.matchType.wholeWord")} · {term.language.toUpperCase()}
                        {term.matchUnaccented ? <span className="block">{t("admin.contentSafety.matchType.alsoWithoutAccentsTitle")}</span> : null}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={term.isActive}
                          disabled={!storageReady || toggleTerm.isPending}
                          onCheckedChange={(checked) => setTermActive(term, checked)}
                          aria-label={t("admin.contentSafety.common.nameActive", { name: term.term })}
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

          {terms.data && terms.data.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink-500 text-sm" aria-live="polite">
                {t("admin.contentSafety.pagination.termsRange", {
                  from: formatNumber(firstIndex + 1),
                  to: formatNumber(firstIndex + visibleTerms.length),
                  total: formatNumber(termList.length),
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                  {t("admin.contentSafety.pagination.previous")}
                </Button>
                <span className="text-ink-600 text-sm tabular-nums">
                  {t("admin.contentSafety.pagination.pageOf", { current: currentPage, total: pageCount })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  {t("admin.contentSafety.pagination.next")}
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section
        title={t("admin.contentSafety.allowlist.title")}
        description={t("admin.contentSafety.allowlist.sectionDescription")}
        actions={
          <Button type="button" size="sm" variant="outline" disabled={!storageReady} onClick={() => setAllowTarget({ phrase: "" })}>
            <Plus aria-hidden="true" />
            {t("admin.contentSafety.common.addPhrase")}
          </Button>
        }
      >
        {allowlist.isError ? (
          <PanelMessage tone="error" title={t("admin.contentSafety.allowlist.loadError")} />
        ) : !allowlist.data ? (
          <Skeleton className="h-32 w-full" />
        ) : allowlist.data.length === 0 ? (
          <PanelMessage title={t("admin.contentSafety.allowlist.emptyTitle")} description={t("admin.contentSafety.allowlist.emptyDescription")} />
        ) : (
          <ul className="divide-ink-100 divide-y">
            {allowlist.data.map((item) => (
              <li key={item.id} className={cn("flex items-center gap-3 py-2.5", !item.isActive && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 font-medium">{item.phrase}</p>
                  {item.note ? <p className="text-ink-500 truncate text-xs">{item.note}</p> : null}
                </div>
                <Switch
                  checked={item.isActive}
                  disabled={!storageReady || toggleAllowlist.isPending}
                  onCheckedChange={(checked) =>
                    toggleAllowlist.mutate({ id: item.id, input: { phrase: item.phrase, isActive: checked, note: item.note } })
                  }
                  aria-label={t("admin.contentSafety.common.nameActive", { name: item.phrase })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hover:translate-y-0"
                  aria-label={t("admin.contentSafety.common.editName", { name: item.phrase })}
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
                  aria-label={t("admin.contentSafety.common.deleteName", { name: item.phrase })}
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
