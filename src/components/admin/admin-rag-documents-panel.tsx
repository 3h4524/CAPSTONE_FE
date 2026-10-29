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

import type { RagAdminDocument } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/utils/cn";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["queued", "Queued"],
  ["ready", "Ready"],
  ["processing", "Processing"],
  ["superseded", "Superseded"],
  ["failed", "Failed"],
] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type AdminRagDocumentsPanelProps = {
  onIngest: () => void;
};

const AdminRagDocumentsPanel = ({ onIngest }: AdminRagDocumentsPanelProps) => {
  const [status, setStatus] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const documentsQuery = useAdminRagDocuments({
    status: status || undefined,
    sourceId: sourceId || undefined,
  });
  const detailQuery = useAdminRagDocument(selectedId);
  const activateMutation = useActivateAdminRagDocument();
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
            Knowledge base
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Documents & versions
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Track every ingested version, inspect its chunks, and choose which completed version is
            active for retrieval.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={documentsQuery.isFetching}
          >
            <RefreshCw className={cn("size-3.5", documentsQuery.isFetching && "animate-spin")} />{" "}
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={onIngest}>
            Ingest document
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search title or listing ID"
            className="sm:max-w-xs"
          />
          <Input
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            placeholder="Filter by source ID"
            className="sm:max-w-xs"
          />
          <Select
            value={status || "all"}
            onValueChange={(value) => setStatus(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[162px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(([value, label]) => (
                <SelectItem key={value || "all"} value={value || "all"}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="self-center text-xs text-slate-400">
            {filteredDocuments.length} of {documentsQuery.data?.length ?? 0} documents
          </span>
          <Select value={pageSize} onValueChange={setPageSize}>
            <SelectTrigger className="w-full sm:ml-auto sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {documentsQuery.isPending ? (
            <PanelMessage text="Loading RAG documents..." />
          ) : documentsQuery.isError ? (
            <PanelMessage text="Could not load RAG documents." />
          ) : documentsQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDocuments.map((document) => (
                  <DocumentRow
                    key={document.id}
                    document={document}
                    isSelected={selectedId === document.id}
                    onSelect={() => setSelectedId(document.id)}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <PanelMessage text="No RAG documents match these filters." />
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4">
          {!selectedId ? (
            <PanelMessage text="Select a document to inspect its version and chunks." />
          ) : detailQuery.isPending ? (
            <PanelMessage text="Loading document detail..." />
          ) : detailQuery.data ? (
            <DocumentDetail
              detail={detailQuery.data.document}
              chunks={detailQuery.data.chunks}
              onActivate={() =>
                activateMutation.mutate(detailQuery.data.document.id, {
                  onSuccess: () => void detailQuery.refetch(),
                })
              }
              isActivating={activateMutation.isPending}
            />
          ) : (
            <PanelMessage text="Document detail is unavailable." />
          )}
        </section>
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
}) => (
  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
    <p className="text-xs text-slate-500">
      Page {page} of {totalPages}
    </p>
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={page === 1}>
        <ChevronLeft className="size-3.5" /> Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={page === totalPages}
      >
        Next <ChevronRight className="size-3.5" />
      </Button>
    </div>
  </div>
);

const DocumentRow = ({
  document,
  isSelected,
  onSelect,
}: {
  document: RagAdminDocument;
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <TableRow className={cn("cursor-pointer", isSelected && "bg-slate-50")} onClick={onSelect}>
    <TableCell>
      <div className="max-w-[230px]">
        <p className="truncate text-xs font-semibold text-slate-800">{document.title}</p>
        <p className="mt-1 truncate text-[11px] text-slate-400">{document.sourceId}</p>
      </div>
    </TableCell>
    <TableCell>
      <span className="text-xs font-medium text-slate-700">
        {document.version || "Unversioned"}
      </span>
    </TableCell>
    <TableCell>
      <StatusBadge status={document.status} />
    </TableCell>
    <TableCell>
      <span className="text-xs text-slate-600">{document.chunkCount}</span>
    </TableCell>
    <TableCell>
      <span className="text-[11px] text-slate-500">{formatDate(document.updatedAt)}</span>
    </TableCell>
    <TableCell>
      <ChevronRight className="size-4 text-slate-300" />
    </TableCell>
  </TableRow>
);

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
  const metadata = chunks[0]?.metadata ?? {};
  const viralScore = readNumber(metadata.viralScore);
  const favorites = readNumber(metadata.favorites);
  const views = readNumber(metadata.views);
  const matchedQuery = readString(metadata.niche);
  const qualityWarnings = [
    !detail.sourceUrl ? "No source URL is attached." : null,
    detail.title.trim().length < 12 ? "Title is very short." : null,
    chunks.length === 0 ? "No chunks were generated." : null,
    chunks.length > 0 && chunks.every((chunk) => chunk.content.trim().length < 80)
      ? "Stored content is unusually short."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <p className="text-sm leading-5 font-bold text-slate-900">{detail.title}</p>
          <p className="mt-1 truncate text-[11px] text-slate-400">{detail.sourceId}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {detail.sourceUrl && (
            <Button type="button" variant="ghost" size="icon" asChild>
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open listing on Etsy"
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
          label="Trend score"
          value={viralScore == null ? "—" : `${viralScore.toFixed(1)}/100`}
          tone="indigo"
        />
        <SignalCard
          label="Favorites"
          value={formatCompact(favorites)}
          icon={<Heart className="size-3.5" />}
          tone="rose"
        />
        <SignalCard
          label="Views"
          value={formatCompact(views)}
          icon={<Eye className="size-3.5" />}
          tone="sky"
        />
        <SignalCard
          label="Keyword"
          value={matchedQuery || "—"}
          icon={<Tag className="size-3.5" />}
          tone="slate"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-xs">
        <Meta label="Version" value={detail.version || "Unversioned"} />
        <Meta label="Chunks" value={String(detail.chunkCount)} />
        <Meta label="Type" value={detail.contentType} />
        <Meta label="Language" value={detail.language} />
        <Meta label="Created" value={formatDate(detail.createdAt)} />
        <Meta label="Updated" value={formatDate(detail.updatedAt)} />
      </div>
      {detail.ingestionError && (
        <div className="my-4 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-700">
          {detail.ingestionError}
        </div>
      )}
      {qualityWarnings.length > 0 && (
        <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <AlertTriangle className="size-3.5" /> Quality checks
          </div>
          <ul className="mt-2 space-y-1 text-[11px] leading-5 text-amber-700">
            {qualityWarnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      {detail.status !== "ready" &&
        detail.status !== "processing" &&
        detail.status !== "queued" && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={onActivate}
            disabled={isActivating}
          >
            <Check className="size-4" /> Activate this version
          </Button>
        )}
      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-900">Listing content</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Expand a chunk to inspect the stored title, description, tags and signals.
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-slate-400">{chunks.length} chunks</span>
        </div>
        <div className="mt-3 max-h-[430px] space-y-2 overflow-x-hidden overflow-y-auto pr-1">
          {chunks.map((chunk) => (
            <details
              key={chunk.id}
              className="group rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                Chunk {chunk.chunkIndex + 1}
                <span className="ml-auto text-[10px] font-normal text-slate-400">
                  {chunk.tokenCount} tokens
                </span>
                <span className="text-slate-300 transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">
                <div className="mb-2 flex justify-end">
                  <CopyButton value={chunk.content} />
                </div>
                <p className="min-w-0 text-[11px] leading-5 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-600">
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
  tone: "indigo" | "rose" | "sky" | "slate";
}) => (
  <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2">
    <div
      className={`flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase ${tone === "rose" ? "text-rose-500" : tone === "sky" ? "text-sky-500" : tone === "indigo" ? "text-indigo-500" : "text-slate-400"}`}
    >
      {icon}
      {label}
    </div>
    <p className="mt-1 truncate text-xs font-bold text-slate-800">{value}</p>
  </div>
);

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);
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
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

const StatusBadge = ({ status }: { status: RagAdminDocument["status"] }) => (
  <Badge
    variant={status === "ready" ? "default" : status === "failed" ? "destructive" : "outline"}
    className={cn(
      "text-[10px]",
      status === "ready" && "bg-emerald-600 hover:bg-emerald-600",
      (status === "queued" || status === "processing") && "text-amber-700",
      status === "superseded" && "text-slate-500"
    )}
  >
    {status}
  </Badge>
);
const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className="mt-1 truncate text-xs font-medium text-slate-700">{value}</p>
  </div>
);
const PanelMessage = ({ text }: { text: string }) => (
  <div className="flex min-h-40 items-center justify-center px-5 text-center text-xs text-slate-400">
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
