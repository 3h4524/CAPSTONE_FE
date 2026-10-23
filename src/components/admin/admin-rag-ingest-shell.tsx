"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";

import { ingestRagDocument, type RagIngestRequest } from "@/api/rag";
import { AdminRagDocumentsPanel } from "@/components/admin/admin-rag-documents-panel";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { cn } from "@/utils/cn";

const CONTENT_TYPES = [
  ["listing", "Listings"],
  ["policy", "Policies"],
  ["keyword", "Keywords"],
  ["image", "Image knowledge"],
  ["video", "Video knowledge"],
] as const;

const ACCEPTED_FILES = ".txt,.md,.csv,.json,.html,.htm";

type AdminRagIngestShellProps = { fullName: string; onLogout: () => void };

const AdminRagIngestShell = ({ fullName, onLogout }: AdminRagIngestShellProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"ingest" | "documents">("ingest");
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("");
  const [language, setLanguage] = useState("en");
  const [contentType, setContentType] = useState<RagIngestRequest["contentType"]>("listing");
  const [content, setContent] = useState("");

  const mutation = useMutation({
    mutationFn: ingestRagDocument,
    onSuccess: ({ documentId }) => {
      showToast("success", `Document ingested successfully (${documentId.slice(0, 8)}…).`);
      setFileName("");
      setContent("");
    },
  });

  const handleFile = async (file: File) => {
    try {
      setContent(await file.text());
      setFileName(file.name);
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setSourceType((current) => (current === "manual" ? "file" : current));
    } catch {
      showToast("error", "Could not read this file.");
    }
  };

  const submit = () => {
    if (!title.trim() || !content.trim()) {
      showToast("error", "Add a title and document content before ingesting.");
      return;
    }

    mutation.mutate({
      title: title.trim(),
      sourceType: sourceType.trim() || "manual",
      sourceUrl: sourceUrl.trim() || undefined,
      version: version.trim() || undefined,
      language,
      content,
      contentType,
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-screen">
        <AdminSidebar fullName={fullName} onLogout={onLogout} activeItem="RAG Ingest" isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)} />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-screen overflow-y-auto">
            <AdminTopbar fullName={fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} pageTitle="RAG Knowledge Base" />
            <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Knowledge base</p>
                <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">RAG Knowledge Base</h1>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Ingest documents, review versions, and control which knowledge is active for retrieval.</p>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  <Button type="button" size="sm" variant={activeTab === "ingest" ? "default" : "ghost"} onClick={() => setActiveTab("ingest")}>Ingest document</Button>
                  <Button type="button" size="sm" variant={activeTab === "documents" ? "default" : "ghost"} onClick={() => setActiveTab("documents")}>Documents & versions</Button>
                </div>
              </div>

              {activeTab === "documents" ? <div className="mt-6"><AdminRagDocumentsPanel onIngest={() => setActiveTab("ingest")} /></div> : <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div><h2 className="text-sm font-bold text-slate-900">Document content</h2><p className="mt-1 text-xs text-slate-400">Plain text is sent to the RAG ingestion pipeline.</p></div>
                    <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Choose file</Button>
                    <input ref={inputRef} type="file" accept={ACCEPTED_FILES} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = ""; }} />
                  </div>

                  <button type="button" onClick={() => inputRef.current?.click()} className={cn("mt-5 flex min-h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-colors hover:border-slate-400 hover:bg-slate-50", fileName ? "border-emerald-200 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60")}>
                    {fileName ? <><CheckCircle2 className="size-6 text-emerald-500" /><span className="mt-2 max-w-full truncate text-xs font-semibold text-slate-700">{fileName}</span><span className="mt-1 text-[11px] text-slate-400">Click to replace</span></> : <><FileText className="size-6 text-slate-400" /><span className="mt-2 text-xs font-semibold text-slate-600">Drop a document here or browse</span><span className="mt-1 text-[11px] text-slate-400">TXT, MD, CSV, JSON, or HTML</span></>}
                  </button>

                  <label className="mt-5 block text-xs font-semibold text-slate-700" htmlFor="rag-content">Content <span className="text-rose-500">*</span></label>
                  <Textarea id="rag-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste or review the document content…" className="mt-2 min-h-[300px] resize-y text-sm leading-6" />
                  <p className="mt-2 text-right text-[11px] text-slate-400">{content.length.toLocaleString()} characters</p>
                </section>

                <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-sm font-bold text-slate-900">Document metadata</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">These fields help retrieval target the right knowledge.</p>
                  <div className="mt-5 space-y-4">
                    <Field label="Title" required><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Shipping policy" /></Field>
                    <Field label="Content type" required><select value={contentType} onChange={(event) => setContentType(event.target.value as RagIngestRequest["contentType"])} className="border-input focus:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2">{CONTENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                    <Field label="Source type"><Input value={sourceType} onChange={(event) => setSourceType(event.target.value)} placeholder="manual, file, url…" /></Field>
                    <Field label="Source URL"><Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></Field>
                    <div className="grid grid-cols-2 gap-3"><Field label="Language"><Input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="en" /></Field><Field label="Version"><Input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v1" /></Field></div>
                  </div>
                  <div className="mt-6 border-t border-slate-100 pt-5"><Button type="button" className="w-full" onClick={submit} disabled={mutation.isPending || !content.trim() || !title.trim()}>{mutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Ingesting…</> : <><Upload className="size-4" /> Ingest document</>}</Button><p className="mt-3 text-center text-[11px] leading-4 text-slate-400">The document will be chunked and embedded for semantic search.</p></div>
                </aside>
              </div>}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => <label className="block text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<span className="mt-2 block">{children}</span></label>;

export { AdminRagIngestShell };
