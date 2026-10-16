"use client";

import { useState } from "react";
import { Check, ChevronRight, RefreshCw } from "lucide-react";

import type { RagAdminDocument } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useActivateAdminRagDocument } from "@/hooks/mutations/use-activate-admin-rag-document";
import { useAdminRagDocument } from "@/hooks/queries/use-admin-rag-document";
import { useAdminRagDocuments } from "@/hooks/queries/use-admin-rag-documents";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { cn } from "@/utils/cn";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["ready", "Ready"],
  ["processing", "Processing"],
  ["superseded", "Superseded"],
  ["failed", "Failed"],
] as const;

type AdminRagDocumentsPanelProps = {
  onIngest: () => void;
};

const AdminRagDocumentsPanel = ({ onIngest }: AdminRagDocumentsPanelProps) => {
  const [status, setStatus] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const documentsQuery = useAdminRagDocuments({ status: status || undefined, sourceId: sourceId || undefined });
  const detailQuery = useAdminRagDocument(selectedId);
  const activateMutation = useActivateAdminRagDocument();
  const queryClient = useAppQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "rag", "documents"] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["admin", "rag", "document", selectedId] });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Knowledge base</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Documents & versions</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Track every ingested version, inspect its chunks, and choose which completed version is active for retrieval.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={documentsQuery.isFetching}>
            <RefreshCw className={cn("size-3.5", documentsQuery.isFetching && "animate-spin")} /> Refresh
          </Button>
          <Button type="button" size="sm" onClick={onIngest}>Ingest document</Button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input value={sourceId} onChange={(event) => setSourceId(event.target.value)} placeholder="Filter by source ID" className="sm:max-w-xs" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="border-input h-9 rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300">
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <span className="self-center text-xs text-slate-400">{documentsQuery.data?.length ?? 0} documents</span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          {documentsQuery.isPending ? <PanelMessage text="Loading RAG documents..." /> : documentsQuery.isError ? <PanelMessage text="Could not load RAG documents." /> : documentsQuery.data?.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Chunks</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {documentsQuery.data.map((document) => <DocumentRow key={document.id} document={document} isSelected={selectedId === document.id} onSelect={() => setSelectedId(document.id)} />)}
              </TableBody>
            </Table>
          ) : <PanelMessage text="No RAG documents match these filters." />}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedId ? <PanelMessage text="Select a document to inspect its version and chunks." /> : detailQuery.isPending ? <PanelMessage text="Loading document detail..." /> : detailQuery.data ? (
            <DocumentDetail detail={detailQuery.data.document} chunks={detailQuery.data.chunks} onActivate={() => activateMutation.mutate(detailQuery.data.document.id, { onSuccess: () => void detailQuery.refetch() })} isActivating={activateMutation.isPending} />
          ) : <PanelMessage text="Document detail is unavailable." />}
        </section>
      </div>
    </div>
  );
};

const DocumentRow = ({ document, isSelected, onSelect }: { document: RagAdminDocument; isSelected: boolean; onSelect: () => void }) => (
  <TableRow className={cn("cursor-pointer", isSelected && "bg-slate-50")} onClick={onSelect}>
    <TableCell><div className="max-w-[230px]"><p className="truncate text-xs font-semibold text-slate-800">{document.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{document.sourceId}</p></div></TableCell>
    <TableCell><span className="text-xs font-medium text-slate-700">{document.version || "Unversioned"}</span></TableCell>
    <TableCell><StatusBadge status={document.status} /></TableCell>
    <TableCell><span className="text-xs text-slate-600">{document.chunkCount}</span></TableCell>
    <TableCell><span className="text-[11px] text-slate-500">{formatDate(document.updatedAt)}</span></TableCell>
    <TableCell><ChevronRight className="size-4 text-slate-300" /></TableCell>
  </TableRow>
);

const DocumentDetail = ({ detail, chunks, onActivate, isActivating }: { detail: RagAdminDocument; chunks: { id: string; chunkIndex: number; tokenCount: number; content: string; metadata: Record<string, unknown> }[]; onActivate: () => void; isActivating: boolean }) => (
  <div>
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{detail.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{detail.sourceId}</p></div>
      <StatusBadge status={detail.status} />
    </div>
    <div className="grid grid-cols-2 gap-3 border-b border-slate-100 py-4 text-xs">
      <Meta label="Version" value={detail.version || "Unversioned"} />
      <Meta label="Chunks" value={String(detail.chunkCount)} />
      <Meta label="Type" value={detail.contentType} />
      <Meta label="Language" value={detail.language} />
      <Meta label="Created" value={formatDate(detail.createdAt)} />
      <Meta label="Updated" value={formatDate(detail.updatedAt)} />
    </div>
    {detail.ingestionError && <div className="my-4 rounded-lg bg-rose-50 p-3 text-xs leading-5 text-rose-700">{detail.ingestionError}</div>}
    {detail.status !== "ready" && detail.status !== "processing" && <Button type="button" variant="outline" className="mt-4 w-full" onClick={onActivate} disabled={isActivating}><Check className="size-4" /> Activate this version</Button>}
    <div className="mt-5"><p className="text-xs font-bold text-slate-900">Chunk preview</p><div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto pr-1">{chunks.map((chunk) => <details key={chunk.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">Chunk {chunk.chunkIndex + 1}<span className="ml-2 text-[10px] font-normal text-slate-400">{chunk.tokenCount} tokens</span></summary><p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">{chunk.content}</p></details>)}</div></div>
  </div>
);

const StatusBadge = ({ status }: { status: RagAdminDocument["status"] }) => <Badge variant={status === "ready" ? "default" : status === "failed" ? "destructive" : "outline"} className={cn("text-[10px]", status === "ready" && "bg-emerald-600 hover:bg-emerald-600", status === "processing" && "text-amber-700", status === "superseded" && "text-slate-500")}>{status}</Badge>;
const Meta = ({ label, value }: { label: string; value: string }) => <div><p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-1 truncate text-xs font-medium text-slate-700">{value}</p></div>;
const PanelMessage = ({ text }: { text: string }) => <div className="flex min-h-40 items-center justify-center px-5 text-center text-xs text-slate-400">{text}</div>;
const formatDate = (value: string) => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export { AdminRagDocumentsPanel };
