"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Info, Loader2, RotateCcw, Upload } from "lucide-react";

import { ingestRagDocument, type RagIngestRequest } from "@/api/rag";
import { AdminMarketResearchPanel } from "@/components/admin/admin-market-research-panel";
import { AdminRagDocumentsPanel } from "@/components/admin/admin-rag-documents-panel";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { cn } from "@/utils/cn";

const CONTENT_TYPES = [
  ["listing", "Listings"],
  ["policy", "Policies"],
  ["keyword", "Keywords"],
  ["faq", "FAQ"],
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("");
  const [language, setLanguage] = useState("en");
  const [contentType, setContentType] = useState<RagIngestRequest["contentType"]>("listing");
  const [content, setContent] = useState("");

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const mutation = useMutation({
    mutationFn: ingestRagDocument,
    onSuccess: ({ documentId }) => {
      showToast("success", `Document ingested successfully (${documentId.slice(0, 8)}…).`);
      setFileName("");
      setContent("");
    },
  });

  const handleFile = async (file: File) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_FILES.split(",").includes(extension)) {
      showToast("error", "Use a TXT, MD, CSV, JSON, or HTML file.");
      return;
    }

    try {
      setContent(await file.text());
      setFileName(file.name);
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setSourceType((current) => (current === "manual" ? "file" : current));
    } catch {
      showToast("error", "Could not read this file.");
    }
  };

  const resetForm = () => {
    setIsDraggingFile(false);
    setFileName("");
    setTitle("");
    setSourceType("manual");
    setSourceUrl("");
    setVersion("");
    setLanguage("en");
    setContentType("listing");
    setContent("");
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
    <div className="h-dvh min-h-0 overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-full min-h-0">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          activeItem="RAG Ingest"
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 overflow-y-auto">
            <AdminTopbar
              fullName={fullName}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
              pageTitle="RAG Knowledge Base"
            />
            <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    Knowledge base
                  </p>
                  <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    RAG Knowledge Base
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                    Ingest documents, review versions, and control which knowledge is active for
                    retrieval.
                  </p>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTab === "ingest" ? "default" : "ghost"}
                    onClick={() => setActiveTab("ingest")}
                  >
                    Ingest document
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTab === "documents" ? "default" : "ghost"}
                    onClick={() => setActiveTab("documents")}
                  >
                    Documents & versions
                  </Button>
                </div>
              </div>

              <RagUsageGuide />

              <>
                <div className={activeTab === "ingest" ? "mt-6" : "hidden"}>
                  <AdminMarketResearchPanel />
                </div>
                <div
                  className={
                    activeTab === "ingest"
                      ? "mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
                      : "hidden"
                  }
                >
                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Document content</h2>
                        <p className="mt-1 text-xs text-slate-400">
                          Plain text is sent to the RAG ingestion pipeline.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetForm}
                          disabled={mutation.isPending}
                        >
                          <RotateCcw className="size-3.5" /> Reset
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => inputRef.current?.click()}
                        >
                          <Upload className="size-3.5" /> Choose file
                        </Button>
                      </div>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => inputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          inputRef.current?.click();
                        }
                      }}
                      className={cn(
                        "mt-5 flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-all hover:border-slate-400 hover:bg-slate-50",
                        isDraggingFile &&
                          "border-primary bg-primary/5 ring-primary/20 scale-[1.01] cursor-copy ring-2",
                        fileName
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-slate-300 bg-slate-50/60"
                      )}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingFile(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) void handleFile(file);
                      }}
                    >
                      {isDraggingFile ? (
                        <>
                          <Upload className="text-primary size-6 animate-bounce" />
                          <span className="text-primary mt-2 text-xs font-semibold">
                            Release to upload
                          </span>
                          <span className="mt-1 text-[11px] text-slate-400">
                            Your document will be loaded here
                          </span>
                        </>
                      ) : fileName ? (
                        <>
                          <CheckCircle2 className="size-6 text-emerald-500" />
                          <span className="mt-2 max-w-full truncate text-xs font-semibold text-slate-700">
                            {fileName}
                          </span>
                          <span className="mt-1 text-[11px] text-slate-400">Click to replace</span>
                        </>
                      ) : (
                        <>
                          <FileText className="size-6 text-slate-400" />
                          <span className="mt-2 text-xs font-semibold text-slate-600">
                            Drop a document here or browse
                          </span>
                          <span className="mt-1 text-[11px] text-slate-400">
                            TXT, MD, CSV, JSON, or HTML
                          </span>
                        </>
                      )}
                      <input
                        id="rag-file-input"
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_FILES}
                        className="sr-only"
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleFile(file);
                          event.target.value = "";
                        }}
                      />
                    </div>

                    <label
                      className="mt-5 block text-xs font-semibold text-slate-700"
                      htmlFor="rag-content"
                    >
                      Content <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      id="rag-content"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Paste or review the document content…"
                      className="mt-2 min-h-[300px] resize-y text-sm leading-6"
                    />
                    <p className="mt-2 text-right text-[11px] text-slate-400">
                      {content.length.toLocaleString()} characters
                    </p>
                  </section>

                  <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-sm font-bold text-slate-900">Document metadata</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      These fields help retrieval target the right knowledge.
                    </p>
                    <div className="mt-5 space-y-4">
                      <Field label="Title" required>
                        <Input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder="e.g. Shipping policy"
                        />
                      </Field>
                      <Field label="Content type" required>
                        <Select
                          value={contentType}
                          onValueChange={(value) =>
                            setContentType(value as RagIngestRequest["contentType"])
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            align="start"
                            className="z-[100] w-[var(--radix-select-trigger-width)]"
                          >
                            {CONTENT_TYPES.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Source type">
                        <Input
                          value={sourceType}
                          onChange={(event) => setSourceType(event.target.value)}
                          placeholder="manual, file, url…"
                        />
                      </Field>
                      <Field label="Source URL">
                        <Input
                          type="url"
                          value={sourceUrl}
                          onChange={(event) => setSourceUrl(event.target.value)}
                          placeholder="https://…"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Language">
                          <Input
                            value={language}
                            onChange={(event) => setLanguage(event.target.value)}
                            placeholder="en"
                          />
                        </Field>
                        <Field label="Version">
                          <Input
                            value={version}
                            onChange={(event) => setVersion(event.target.value)}
                            placeholder="v1"
                          />
                        </Field>
                      </div>
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={submit}
                        disabled={mutation.isPending || !content.trim() || !title.trim()}
                      >
                        {mutation.isPending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Ingesting…
                          </>
                        ) : (
                          <>
                            <Upload className="size-4" /> Ingest document
                          </>
                        )}
                      </Button>
                      <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                        The document will be chunked and embedded for semantic search.
                      </p>
                    </div>
                  </aside>
                </div>
                <div className={activeTab === "documents" ? "mt-6" : "hidden"}>
                  <AdminRagDocumentsPanel onIngest={() => setActiveTab("ingest")} />
                </div>
              </>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block text-xs font-semibold text-slate-700">
    {label}
    {required && <span className="text-rose-500"> *</span>}
    <span className="mt-2 block">{children}</span>
  </label>
);

const RagUsageGuide = () => (
  <section className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
        <Info className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900">
          Quick guide: how to use the RAG knowledge base
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Add trusted information here so the assistant can find and use it later.
        </p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <GuideStep
        number="1"
        title="Choose a source"
        text="Paste content, upload a file, or run Etsy research for public listing signals."
      />
      <GuideStep
        number="2"
        title="Add metadata"
        text="Enter a clear title, content type, language, and version so documents are easy to find."
      />
      <GuideStep
        number="3"
        title="Ingest document"
        text="Click Ingest document. The system splits, embeds, and indexes the content for search."
      />
      <GuideStep
        number="4"
        title="Review versions"
        text="Open Documents & versions to check status and manage which version is active."
      />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-indigo-100 pt-3 text-[11px] leading-5 text-slate-500">
      <span className="font-semibold text-indigo-700">Etsy tip:</span>
      <span>
        Run now automatically selects the top 3 listings and queues them for RAG. Enable a schedule
        for recurring research.
      </span>
      <ArrowRight className="size-3.5 text-indigo-400" />
      <span>Use only information you are allowed to store and retrieve.</span>
    </div>
  </section>
);

const GuideStep = ({ number, title, text }: { number: string; title: string; text: string }) => (
  <div className="rounded-lg border border-white/80 bg-white/80 p-3">
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
        {number}
      </span>
      <p className="text-xs font-bold text-slate-800">{title}</p>
    </div>
    <p className="mt-2 text-[11px] leading-5 text-slate-500">{text}</p>
  </div>
);

export { AdminRagIngestShell };
