"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Eye,
  Heart,
  RefreshCw,
  Tag,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RagAdminDocument } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActivateAdminRagDocument } from "@/hooks/mutations/use-activate-admin-rag-document";
import { useAdminRagDocument } from "@/hooks/queries/use-admin-rag-document";
import { useAdminRagDocuments } from "@/hooks/queries/use-admin-rag-documents";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

const STATUS_OPTIONS = [
  ["", "admin.dashboard.ragDocuments.statusAll"],
  ["queued", "admin.dashboard.ragDocuments.statusQueued"],
  ["ready", "admin.dashboard.ragDocuments.statusReady"],
  ["processing", "admin.dashboard.ragDocuments.statusProcessing"],
  ["superseded", "admin.dashboard.ragDocuments.statusSuperseded"],
  ["failed", "admin.dashboard.ragDocuments.statusFailed"],
] as const;

const STATUS_LABEL_KEYS: Record<string, string> = {
  queued: "admin.dashboard.ragDocuments.statusQueued",
  ready: "admin.dashboard.ragDocuments.statusReady",
  processing: "admin.dashboard.ragDocuments.statusProcessing",
  superseded: "admin.dashboard.ragDocuments.statusSuperseded",
  failed: "admin.dashboard.ragDocuments.statusFailed",
};
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type AdminRagDocumentsPanelProps = {
  isActive: boolean;
  selectedId: string | null;
  onSelect: (documentId: string | null) => void;
  onIngest: () => void;
};

const AdminRagDocumentsPanel = ({ isActive, selectedId, onSelect, onIngest }: AdminRagDocumentsPanelProps) => {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const documentsQuery = useAdminRagDocuments({
    status: status || undefined,
    sourceId: sourceId || undefined,
  });
  const detailQuery = useAdminRagDocument(selectedId);
  const { mutate: activateDocument, isPending: isActivatingDocument } = useActivateAdminRagDocument();
  const isPhone = useIsPhone();
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return documentsQuery.data ?? [];
    return (documentsQuery.data ?? []).filter(
      (document) =>
        document.title.toLowerCase().includes(normalizedSearch) ||
        document.sourceId.toLowerCase().includes(normalizedSearch)
    );
  }, [documentsQuery.data, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / Number(pageSize)));
  const visibleDocuments = useMemo(
    () => filteredDocuments.slice((page - 1) * Number(pageSize), page * Number(pageSize)),
    [filteredDocuments, page, pageSize]
  );

  useEffect(() => setPage(1), [status, sourceId, searchTerm, pageSize]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const refresh = async () => {
    await Promise.all([
      documentsQuery.refetch(),
      selectedId ? detailQuery.refetch() : Promise.resolve(),
    ]);
  };

  const detailPanel = !selectedId ? (
    <PanelMessage text={t("admin.dashboard.ragDocuments.selectDocumentHint")} />
  ) : detailQuery.isPending ? (
    <PanelMessage text={t("admin.dashboard.ragDocuments.loadingDetail")} />
  ) : detailQuery.data ? (
    <DocumentDetail
      detail={detailQuery.data.document}
      chunks={detailQuery.data.chunks}
      onActivate={() => activateDocument(detailQuery.data.document.id)}
      isActivating={isActivatingDocument}
    />
  ) : (
    <PanelMessage text={t("admin.dashboard.ragDocuments.detailUnavailable")} />
  );

  return (
    <div className="space-y-5 max-md:space-y-3">
      <div className="flex flex-col justify-between gap-4 max-md:gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">
            {t("admin.dashboard.ragDocuments.kbEyebrow")}
          </p>
          <h2 className="font-display text-ink-900 mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">
            {t("admin.dashboard.ragDocuments.kbTitle")}
          </h2>
          <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-5">
            {t("admin.dashboard.ragDocuments.kbDescription")}
          </p>
        </div>
        <div className="flex gap-2 max-md:grid max-md:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={documentsQuery.isFetching}
          >
            <RefreshCw className={cn("size-3.5", documentsQuery.isFetching && "animate-spin")} />{" "}
            {t("admin.dashboard.ragDocuments.refresh")}
          </Button>
          <Button type="button" size="sm" onClick={onIngest}>
            {t("admin.dashboard.ragDocuments.ingestDocument")}
          </Button>
        </div>
      </div>

      <section className="border-ink-200 bg-card rounded-xl border p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 max-md:grid max-md:grid-cols-2 max-md:gap-2 md:flex-row">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("admin.dashboard.ragDocuments.searchPlaceholder")}
            className="max-md:col-span-2 md:max-w-xs"
          />
          <Input
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            placeholder={t("admin.dashboard.ragDocuments.sourceIdPlaceholder")}
            className="md:max-w-xs"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => setStatus(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full md:w-[162px]">
              <SelectValue placeholder={t("admin.dashboard.ragDocuments.statusAll")} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(([value, labelKey]) => (
                <SelectItem key={value || "all"} value={value || "all"}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-ink-400 self-center text-xs">
            {t("admin.dashboard.ragDocuments.documentsCount", {
              shown: filteredDocuments.length,
              total: documentsQuery.data?.length ?? 0,
            })}
          </span>
          <Select value={pageSize} onValueChange={setPageSize}>
            <SelectTrigger className="w-full max-md:w-32 max-md:justify-self-end md:ml-auto md:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {t("admin.dashboard.ragDocuments.perPage", { size })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 max-md:gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="border-ink-200 bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none">
          {documentsQuery.isPending ? (
            <PanelMessage text={t("admin.dashboard.ragDocuments.loadingDocuments")} />
          ) : documentsQuery.isError ? (
            <PanelMessage text={t("admin.dashboard.ragDocuments.loadError")} />
          ) : documentsQuery.data?.length && isPhone ? (
            <ul className="space-y-2">
              {visibleDocuments.map((document) => (
                <li key={document.id}>
                  <DocumentCard document={document} onSelect={() => onSelect(document.id)} />
                </li>
              ))}
            </ul>
          ) : documentsQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.dashboard.ragDocuments.thDocument")}</TableHead>
                  <TableHead>{t("admin.dashboard.ragDocuments.thVersion")}</TableHead>
                  <TableHead>{t("admin.dashboard.ragDocuments.thStatus")}</TableHead>
                  <TableHead>{t("admin.dashboard.ragDocuments.thChunks")}</TableHead>
                  <TableHead>{t("admin.dashboard.ragDocuments.thUpdated")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    isSelected={selectedId === document.id}
                    onSelect={() => onSelect(document.id)}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <PanelMessage text={t("admin.dashboard.ragDocuments.noMatch")} />
          )}
          {filteredDocuments.length > 0 && (
            <DocumentPagination
              page={page}
              totalPages={totalPages}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          )}
        </section>

        {/* Below a long list the detail would open out of sight, so a phone shows it over the list. */}
        {isPhone ? (
          <Dialog open={isActive && Boolean(selectedId)} onOpenChange={(open) => !open && onSelect(null)}>
            <DialogContent className="grid-cols-[minmax(0,1fr)] p-4" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{t("admin.dashboard.ragDocuments.dialogDetailTitle")}</DialogTitle>
              {detailPanel}
            </DialogContent>
          </Dialog>
        ) : (
          <section className="border-ink-200 bg-card rounded-xl border p-5 shadow-sm xl:sticky xl:top-4">{detailPanel}</section>
        )}
      </div>
    </div>
  );
};

const DocumentPagination = ({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) => {
  const { t } = useTranslation("common");

  return (
  <div className="border-ink-100 bg-ink-50/50 flex items-center justify-between border-t px-4 py-3 max-md:border-t-0 max-md:bg-transparent max-md:px-0">
    <p className="text-ink-500 text-xs">
      {t("admin.dashboard.ragDocuments.pageOf", { page, totalPages })}
    </p>
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={page === 1}>
        <ChevronLeft className="size-3.5" /> {t("admin.dashboard.ragDocuments.previous")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={page === totalPages}
      >
        {t("admin.dashboard.ragDocuments.next")} <ChevronRight className="size-3.5" />
      </Button>
    </div>
  </div>
  );
};

/** A document on a phone: everything its table row shows, without the columns. */
const DocumentCard = ({ document, onSelect }: { document: RagAdminDocument; onSelect: () => void }) => {
  const { t } = useTranslation("common");

  return (
  <button type="button" onClick={onSelect} className="border-ink-200 bg-card w-full rounded-xl border p-3 text-left shadow-xs">
    <span className="flex items-start justify-between gap-2">
      <span className="min-w-0">
        <span className="text-ink-800 block truncate text-sm font-semibold">{document.title}</span>
        <span className="text-ink-400 mt-0.5 block truncate text-[11px]">{document.sourceId}</span>
      </span>
      <StatusBadge status={document.status} />
    </span>
    <span className="border-ink-100 text-ink-500 mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[11px]">
      <span className="min-w-0 truncate">
        {document.version || t("admin.dashboard.ragDocuments.unversioned")} ·{" "}
        {t("admin.dashboard.ragDocuments.chunksCount", { chunks: document.chunkCount })}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {formatDate(document.updatedAt)}
        <ChevronRight className="text-ink-300 size-3.5" aria-hidden="true" />
      </span>
    </span>
  </button>
  );
};

const DocumentRow = ({
  document,
  isSelected,
  onSelect,
}: {
  document: RagAdminDocument;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const { t } = useTranslation("common");

  return (
  <TableRow className={cn("cursor-pointer", isSelected && "bg-ink-50")} onClick={onSelect}>
    <TableCell>
      <div className="max-w-[230px]">
        <p className="text-ink-800 truncate text-xs font-semibold">{document.title}</p>
        <p className="text-ink-400 mt-1 truncate text-[11px]">{document.sourceId}</p>
      </div>
    </TableCell>
    <TableCell>
      <span className="text-ink-700 text-xs font-medium">
        {document.version || t("admin.dashboard.ragDocuments.unversioned")}
      </span>
    </TableCell>
    <TableCell>
      <StatusBadge status={document.status} />
    </TableCell>
    <TableCell>
      <span className="text-ink-600 text-xs">{document.chunkCount}</span>
    </TableCell>
    <TableCell>
      <span className="text-ink-500 text-[11px]">{formatDate(document.updatedAt)}</span>
    </TableCell>
    <TableCell>
      <ChevronRight className="text-ink-300 size-4" />
    </TableCell>
  </TableRow>
  );
};

const DocumentDetail = ({
  detail,
  chunks,
  onActivate,
  isActivating,
}: {
  detail: RagAdminDocument;
  chunks: {
    id: string;
    chunkIndex: number;
    tokenCount: number;
    content: string;
    metadata: Record<string, unknown>;
  }[];
  onActivate: () => void;
  isActivating: boolean;
}) => {
  const { t } = useTranslation("common");
  const metadata = chunks[0]?.metadata ?? {};
  const viralScore = readNumber(metadata.viralScore);
  const favorites = readNumber(metadata.favorites);
  const views = readNumber(metadata.views);
  const matchedQuery = readString(metadata.niche);
  const qualityWarnings = [
    !detail.sourceUrl ? t("admin.dashboard.ragDocuments.warningNoUrl") : null,
    detail.title.trim().length < 12 ? t("admin.dashboard.ragDocuments.warningShortTitle") : null,
    chunks.length === 0 ? t("admin.dashboard.ragDocuments.warningNoChunks") : null,
    chunks.length > 0 && chunks.every((chunk) => chunk.content.trim().length < 80)
      ? t("admin.dashboard.ragDocuments.warningShortContent")
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <div>
      <div className="border-ink-100 flex items-start justify-between gap-3 border-b pb-4 max-md:pr-8">
        <div className="min-w-0">
          <p className="text-ink-900 text-sm leading-5 font-bold">{detail.title}</p>
          <p className="text-ink-400 mt-1 truncate text-[11px]">{detail.sourceId}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {detail.sourceUrl && (
            <Button type="button" variant="ghost" size="icon" asChild>
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={t("admin.dashboard.ragDocuments.openOnEtsy")}
              >
                <ExternalLink className="size-4" />
              </a>
            </Button>
          )}
          <StatusBadge status={detail.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SignalCard
          label={t("admin.dashboard.ragDocuments.signalTrendScore")}
          value={viralScore == null ? "—" : `${viralScore.toFixed(1)}/100`}
          tone="slate"
        />
        <SignalCard
          label={t("admin.dashboard.ragDocuments.signalFavorites")}
          value={formatCompact(favorites)}
          icon={<Heart className="size-3.5" />}
          tone="rose"
        />
        <SignalCard
          label={t("admin.dashboard.ragDocuments.signalViews")}
          value={formatCompact(views)}
          icon={<Eye className="size-3.5" />}
          tone="sky"
        />
        <SignalCard
          label={t("admin.dashboard.ragDocuments.signalKeyword")}
          value={matchedQuery || "—"}
          icon={<Tag className="size-3.5" />}
          tone="slate"
        />
      </div>

      <div className="border-ink-100 mt-4 grid grid-cols-2 gap-3 border-y py-4 text-xs">
        <Meta label={t("admin.dashboard.ragDocuments.metaVersion")} value={detail.version || t("admin.dashboard.ragDocuments.unversioned")} />
        <Meta label={t("admin.dashboard.ragDocuments.metaChunks")} value={String(detail.chunkCount)} />
        <Meta label={t("admin.dashboard.ragDocuments.metaType")} value={detail.contentType} />
        <Meta label={t("admin.dashboard.ragDocuments.metaLanguage")} value={detail.language} />
        <Meta label={t("admin.dashboard.ragDocuments.metaCreated")} value={formatDate(detail.createdAt)} />
        <Meta label={t("admin.dashboard.ragDocuments.metaUpdated")} value={formatDate(detail.updatedAt)} />
      </div>
      {detail.ingestionError && (
        <div className="my-4 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {detail.ingestionError}
        </div>
      )}
      {qualityWarnings.length > 0 && (
        <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="size-3.5" /> {t("admin.dashboard.ragDocuments.qualityChecks")}
          </div>
          <ul className="mt-2 space-y-1 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
            {qualityWarnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      {detail.status === "superseded" && detail.chunkCount > 0 && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={onActivate}
          disabled={isActivating}
        >
          <Check className="size-4" /> {t("admin.dashboard.ragDocuments.activateVersion")}
        </Button>
      )}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-ink-900 text-xs font-bold">{t("admin.dashboard.ragDocuments.listingContent")}</p>
            <p className="text-ink-400 mt-1 text-[11px]">
              {t("admin.dashboard.ragDocuments.expandChunkHint")}
            </p>
          </div>
          <span className="text-ink-400 shrink-0 text-[10px]">
            {t("admin.dashboard.ragDocuments.chunksCount", { chunks: chunks.length })}
          </span>
        </div>
        <div className="mt-3 max-h-[430px] space-y-2 overflow-x-hidden overflow-y-auto pr-1 max-md:max-h-none max-md:pr-0">
          {chunks.map((chunk) => (
            <details
              key={chunk.id}
              className="group border-ink-200 bg-card rounded-lg border shadow-sm"
            >
              <summary className="text-ink-700 flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold [&::-webkit-details-marker]:hidden">
                {t("admin.dashboard.ragDocuments.chunkTitle", { number: chunk.chunkIndex + 1 })}
                <span className="text-ink-400 ml-auto text-[10px] font-normal">
                  {t("admin.dashboard.ragDocuments.tokens", { tokens: chunk.tokenCount })}
                </span>
                <span className="text-ink-300 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="border-ink-100 bg-ink-50/60 border-t px-3 py-3">
                <div className="mb-2 flex justify-end">
                  <CopyButton value={chunk.content} />
                </div>
                <p className="text-ink-600 min-w-0 text-[11px] leading-5 [overflow-wrap:anywhere] break-words whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

const SignalCard = ({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone: "rose" | "sky" | "slate";
}) => (
  <div className="border-ink-100 bg-ink-50/70 min-w-0 rounded-lg border px-2.5 py-2">
    <div
      className={`flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase ${tone === "rose" ? "text-rose-500" : tone === "sky" ? "text-sky-500" : "text-ink-400"}`}
    >
      {icon}
      {label}
    </div>
    <p className="text-ink-800 mt-1 truncate text-xs font-bold">{value}</p>
  </div>
);

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation("common");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={copy}>
      <Clipboard className="mr-1 size-3" />
      {copied ? t("admin.dashboard.ragDocuments.copied") : t("admin.dashboard.ragDocuments.copy")}
    </Button>
  );
};

const StatusBadge = ({ status }: { status: RagAdminDocument["status"] }) => {
  const { t } = useTranslation("common");
  const labelKey = STATUS_LABEL_KEYS[status];

  return (
  <Badge
    variant={status === "ready" ? "default" : status === "failed" ? "destructive" : "outline"}
    className={cn(
      "text-[10px]",
      status === "ready" && "bg-emerald-600 hover:bg-emerald-600",
      (status === "queued" || status === "processing") && "text-amber-700 dark:text-amber-300",
      status === "superseded" && "text-ink-500"
    )}
  >
    {labelKey ? t(labelKey) : status}
  </Badge>
  );
};
const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-ink-400 text-[10px] font-semibold tracking-wide uppercase">{label}</p>
    <p className="text-ink-700 mt-1 truncate text-xs font-medium">{value}</p>
  </div>
);
const PanelMessage = ({ text }: { text: string }) => (
  <div className="text-ink-400 flex min-h-40 items-center justify-center px-5 text-center text-xs">
    {text}
  </div>
);
const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value : null);
const formatCompact = (value: number | null) =>
  value == null
    ? "—"
    : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export { AdminRagDocumentsPanel };
