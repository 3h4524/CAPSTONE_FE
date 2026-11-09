"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Info, Loader2, RotateCcw, Upload } from "lucide-react";

import { ingestRagDocument, type RagIngestRequest } from "@/api/rag";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminMarketResearchPanel } from "@/components/admin/admin-market-research-panel";
import { AdminRagDocumentsPanel } from "@/components/admin/admin-rag-documents-panel";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { RagSearchPlayground } from "@/components/admin/rag-search-playground";
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
import { useIsPhone } from "@/hooks/use-is-phone";
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

type AdminRagTab = "ingest" | "research" | "documents" | "search";

const RAG_TABS: { value: AdminRagTab; label: string; shortLabel: string }[] = [
  { value: "ingest", label: "Ingest document", shortLabel: "Ingest" },
  { value: "research", label: "Market Insights", shortLabel: "Insights" },
  { value: "documents", label: "Documents & versions", shortLabel: "Docs" },
  { value: "search", label: "Search playground", shortLabel: "Search" },
];

type AdminRagIngestShellProps = {
  fullName: string;
  onLogout: () => void;
  initialTab?: AdminRagTab;
};

const AdminRagIngestShell = ({ fullName, onLogout, initialTab = "ingest" }: AdminRagIngestShellProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminRagTab>(initialTab);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("");
  const [language, setLanguage] = useState("en");
  const [contentType, setContentType] = useState<RagIngestRequest["contentType"]>("listing");
  const [content, setContent] = useState("");
  const isPhone = useIsPhone();
  // Only the title and type are required, so a phone keeps the optional fields one tap away.
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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
    setSourceId("");
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
      sourceId: sourceId.trim() || undefined,
      sourceType: sourceType.trim() || "manual",
      sourceUrl: sourceUrl.trim() || undefined,
      version: version.trim() || undefined,
      language,
      content,
      contentType,
    });
  };

  return (
    <div className="bg-ink-50 text-ink-900 dark:bg-background relative h-dvh min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          activeItem={activeTab === "research" ? "Market Insights" : "RAG Knowledge Base"}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="dark:lg:bg-panel flex h-dvh min-w-0 flex-1 flex-col overflow-hidden dark:lg:my-2 dark:lg:mr-2 dark:lg:h-[calc(100dvh-1rem)] dark:lg:rounded-xl dark:lg:border">
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <AdminTopbar
              fullName={fullName}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
              pageTitle={activeTab === "research" ? "Market Insights" : "RAG Knowledge Base"}
            />
            <main className="mx-auto max-w-[1600px] px-4 py-4 max-md:pb-16 sm:py-5 md:px-[calc(1.5rem+1cm)] 2xl:max-w-[1720px]">
              <div className="flex flex-col justify-between gap-4 max-md:gap-3 md:flex-row md:items-end">
                {/* These two tabs open with a heading of their own. */}
                <div className={cn((activeTab === "documents" || activeTab === "search") && "max-md:hidden")}>
                  <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">
                    Knowledge base
                  </p>
                  <h1 className="font-display text-ink-900 mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">
                    {activeTab === "research" ? "Market Insights" : "RAG Knowledge Base"}
                  </h1>
                  <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-5">
                    {activeTab === "research"
                      ? "Manage the shared public Etsy dataset used by seller-facing Market Radar."
                      : "Ingest documents, review versions, and control which knowledge is active for retrieval."}
                  </p>
                </div>
                <div className="border-ink-200 bg-card flex flex-wrap rounded-lg border p-1 shadow-sm max-md:grid max-md:grid-cols-4 max-md:gap-1">
                  {RAG_TABS.map((tab) => (
                    <Button
                      key={tab.value}
                      type="button"
                      size="sm"
                      variant={activeTab === tab.value ? "default" : "ghost"}
                      className="max-md:min-h-10 max-md:min-w-0 max-md:px-1 max-md:text-xs"
                      onClick={() => setActiveTab(tab.value)}
                    >
                      <span className="max-md:hidden">{tab.label}</span>
                      <span className="md:hidden">{tab.shortLabel}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <>
                {/* The guide only concerns adding knowledge, and folds away once read. */}
                {activeTab === "ingest" && <RagUsageGuide />}
                <div className={activeTab === "research" ? "mt-6 max-md:mt-3" : "hidden"}>
                  <AdminMarketResearchPanel />
                </div>
                <div
                  className={
                    activeTab === "ingest"
                      ? "mt-5 grid gap-5 max-md:mt-3 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 xl:grid-cols-[minmax(0,1fr)_340px]"
                      : "hidden"
                  }
                >
                  <section className="border-ink-200 bg-card rounded-xl border p-5 shadow-sm max-md:p-4 sm:p-6">
                    <div className="border-ink-100 flex items-center justify-between gap-3 border-b pb-4">
                      <div>
                        <h2 className="text-ink-900 text-sm font-bold">Document content</h2>
                        <p className="text-ink-400 mt-1 text-xs">
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
                          className="max-md:hidden"
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
                        "hover:border-ink-400 hover:bg-ink-50 mt-5 flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-all",
                        isDraggingFile &&
                          "border-primary bg-primary/5 ring-primary/20 scale-[1.01] cursor-copy ring-2",
                        fileName
                          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                          : "border-ink-300 bg-ink-50/60"
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
                          <span className="text-ink-400 mt-1 text-[11px]">
                            Your document will be loaded here
                          </span>
                        </>
                      ) : fileName ? (
                        <>
                          <CheckCircle2 className="size-6 text-emerald-500" />
                          <span className="text-ink-700 mt-2 max-w-full truncate text-xs font-semibold">
                            {fileName}
                          </span>
                          <span className="text-ink-400 mt-1 text-[11px] max-md:hidden">Click to replace</span>
                          <span className="text-ink-400 mt-1 text-[11px] md:hidden">Tap to replace</span>
                        </>
                      ) : (
                        <>
                          <FileText className="text-ink-400 size-6" />
                          <span className="text-ink-600 mt-2 text-xs font-semibold max-md:hidden">
                            Drop a document here or browse
                          </span>
                          <span className="text-ink-600 mt-2 text-xs font-semibold md:hidden">
                            Tap to choose a file
                          </span>
                          <span className="text-ink-400 mt-1 text-[11px]">
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
                      className="text-ink-700 mt-5 block text-xs font-semibold"
                      htmlFor="rag-content"
                    >
                      Content <span className="text-rose-500">*</span>
                    </label>
                    <Textarea
                      id="rag-content"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Paste or review the document content…"
                      className="mt-2 min-h-[300px] resize-y text-sm leading-6 max-md:min-h-40 max-md:text-base"
                    />
                    <p className="text-ink-400 mt-2 text-right text-[11px]">
                      {content.length.toLocaleString()} characters
                    </p>
                  </section>

                  <aside className="border-ink-200 bg-card rounded-xl border p-5 shadow-sm max-md:p-4 sm:p-6">
                    <h2 className="text-ink-900 text-sm font-bold">Document metadata</h2>
                    <p className="text-ink-400 mt-1 text-xs leading-5">
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
                      <button
                        type="button"
                        aria-expanded={isMoreOpen}
                        onClick={() => setIsMoreOpen((open) => !open)}
                        className="text-ink-700 flex min-h-10 w-full items-center justify-between text-xs font-semibold md:hidden"
                      >
                        More details
                        <ChevronDown className={cn("text-ink-400 size-4 transition-transform", isMoreOpen && "rotate-180")} aria-hidden="true" />
                      </button>
                      <div className={cn("space-y-4", !isMoreOpen && "max-md:hidden")}>
                      <Field label="Source id">
                        <Input
                          value={sourceId}
                          onChange={(event) => setSourceId(event.target.value)}
                          placeholder={isPhone ? "faq-about-apcs" : "faq-about-apcs (same id replaces the older version)"}
                        />
                        <span className="text-ink-400 mt-1 block text-[11px] font-normal md:hidden">The same id replaces the older version.</span>
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
                    </div>
                    <div className="border-ink-100 mt-6 border-t pt-5">
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
                      <p className="text-ink-400 mt-3 text-center text-[11px] leading-4">
                        {!title.trim() || !content.trim()
                          ? `Add ${!title.trim() && !content.trim() ? "a title and content" : !title.trim() ? "a title" : "content"} to ingest the document.`
                          : "The document will be chunked and embedded for semantic search."}
                      </p>
                    </div>
                  </aside>
                </div>
                <div className={activeTab === "documents" ? "mt-6 max-md:mt-3" : "hidden"}>
                  <AdminRagDocumentsPanel onIngest={() => setActiveTab("ingest")} />
                </div>
                <div className={activeTab === "search" ? "mt-6 max-md:mt-3" : "hidden"}>
                  <RagSearchPlayground />
                </div>
              </>
            </main>
          </div>
          <AdminBottomNav onOpenMore={() => setIsMobileSidebarOpen(true)} />
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
  <label className="text-ink-700 block text-xs font-semibold">
    {label}
    {required && <span className="text-rose-500"> *</span>}
    <span className="mt-2 block">{children}</span>
  </label>
);

const RagUsageGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section className="border-ink-200 bg-card mt-6 rounded-xl border p-4 shadow-sm max-md:mt-3 sm:p-5">
      <div className="flex items-start gap-3 max-md:flex-wrap max-md:gap-y-1">
        <div className="bg-ink-100 text-ink-600 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Info className="size-4" />
        </div>
        {/* On a phone the text keeps the row beside the icon and the button drops below it. */}
        <div className="max-md:basis-[calc(100%-2.75rem)]">
          <h2 className="text-ink-900 text-sm font-bold">
            Quick guide: how to use the RAG knowledge base
          </h2>
          <p className="text-ink-500 mt-1 text-xs leading-5">
            Add trusted information here so the assistant can find and use it later.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
        >
          <ChevronDown className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? "Hide steps" : "Show steps"}
        </Button>
      </div>
      {isOpen && (
        <>
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
          <div className="border-ink-100 text-ink-500 mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-[11px] leading-5">
            <span className="text-ink-800 font-semibold">Etsy tip:</span>
            <span>
              Run now automatically selects the top 3 listings and queues them for RAG. Enable a schedule
              for recurring research.
            </span>
            <ArrowRight className="text-ink-400 size-3.5" />
            <span>Use only information you are allowed to store and retrieve.</span>
          </div>
        </>
      )}
    </section>
  );
};

const GuideStep = ({ number, title, text }: { number: string; title: string; text: string }) => (
  <div className="border-ink-100 bg-ink-50/60 rounded-lg border p-3">
    <div className="flex items-center gap-2">
      <span className="bg-ink-100 text-ink-700 flex size-6 items-center justify-center rounded-full text-[11px] font-bold">
        {number}
      </span>
      <p className="text-ink-800 text-xs font-bold">{title}</p>
    </div>
    <p className="text-ink-500 mt-2 text-[11px] leading-5">{text}</p>
  </div>
);

export { AdminRagIngestShell };
