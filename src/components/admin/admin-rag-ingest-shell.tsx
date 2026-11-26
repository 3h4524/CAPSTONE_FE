"use client";

import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Info, Loader2, RotateCcw, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AdminMarketResearchPanel } from "@/components/admin/admin-market-research-panel";
import { AdminRagDocumentsPanel } from "@/components/admin/admin-rag-documents-panel";
import { RagSearchPlayground } from "@/components/admin/rag-search-playground";
import { PageHeader } from "@/components/commons/layout/page-header";
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
import { RAG_MANUAL_CONTENT_TYPE_OPTIONS } from "@/constants/rag";
import { showToast } from "@/helpers/toast";
import { useIngestRagDocument } from "@/hooks/mutations/use-ingest-rag-document";
import { useAdminShellOptions } from "@/hooks/use-admin-shell-options";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

const ACCEPTED_FILES = ".txt,.md,.csv,.json,.html,.htm";

type AdminRagTab = "ingest" | "research" | "documents" | "search";
type ManualRagContentType = (typeof RAG_MANUAL_CONTENT_TYPE_OPTIONS)[number][0];

const RAG_TABS: { value: AdminRagTab; labelKey: string; shortLabelKey: string }[] = [
  { value: "ingest", labelKey: "admin.dashboard.ragIngest.tabs.ingest", shortLabelKey: "admin.dashboard.ragIngest.tabs.ingestShort" },
  { value: "research", labelKey: "admin.dashboard.ragIngest.tabs.research", shortLabelKey: "admin.dashboard.ragIngest.tabs.researchShort" },
  { value: "documents", labelKey: "admin.dashboard.ragIngest.tabs.documents", shortLabelKey: "admin.dashboard.ragIngest.tabs.documentsShort" },
  { value: "search", labelKey: "admin.dashboard.ragIngest.tabs.search", shortLabelKey: "admin.dashboard.ragIngest.tabs.searchShort" },
];

type AdminRagIngestShellProps = {
  initialTab?: AdminRagTab;
};

const AdminRagIngestShell = ({ initialTab = "ingest" }: AdminRagIngestShellProps) => {
  const { t } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AdminRagTab>(initialTab);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [submittedDocumentId, setSubmittedDocumentId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sourceType, setSourceType] = useState("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [version, setVersion] = useState("");
  const [language, setLanguage] = useState("en");
  const [contentType, setContentType] = useState<ManualRagContentType>("listing");
  const [content, setContent] = useState("");
  const isPhone = useIsPhone();
  // Only the title and type are required, so a phone keeps the optional fields one tap away.
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useAdminShellOptions({
    title: t(activeTab === "research" ? "navigation.admin.items.marketInsights" : "navigation.admin.items.ragKnowledgeBase"),
  });

  const { mutate: ingestDocument, isPending: isIngesting } = useIngestRagDocument();

  const handleFile = async (file: File) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!ACCEPTED_FILES.split(",").includes(extension)) {
      showToast("error", t("admin.dashboard.ragIngest.fileTypeError"));
      return;
    }

    try {
      setContent(await file.text());
      setFileName(file.name);
      setTitle((current) => current || file.name.replace(/\.[^.]+$/, ""));
      setSourceType((current) => (current === "manual" ? "file" : current));
    } catch {
      showToast("error", t("admin.dashboard.ragIngest.fileReadError"));
    }
  };

  const resetForm = () => {
    setSubmittedDocumentId(null);
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
      showToast("error", t("admin.dashboard.ragIngest.titleContentRequired"));
      return;
    }

    setSubmittedDocumentId(null);
    ingestDocument({
      title: title.trim(),
      sourceId: sourceId.trim() || undefined,
      sourceType: sourceType.trim() || "manual",
      sourceUrl: sourceUrl.trim() || undefined,
      version: version.trim() || undefined,
      language,
      content,
      contentType,
    }, {
      onSuccess: ({ documentId }) => {
        setSubmittedDocumentId(documentId);
        setFileName("");
        setContent("");
      },
    });
  };

  return (
    <>
      {/* The tabs sit beside the title only where both fit on one line; otherwise they go under it. They never wrap. */}
      <div className="flex flex-col justify-between gap-4 max-md:gap-3 xl:flex-row xl:items-end">
        <PageHeader
          className={cn("min-w-0", (activeTab === "documents" || activeTab === "search") && "max-md:hidden")}
          eyebrow={t("admin.dashboard.ragIngest.eyebrow")}
          title={
            activeTab === "research"
              ? t("admin.dashboard.ragIngest.titleInsights")
              : t("admin.dashboard.ragIngest.titleRag")
          }
          description={
            activeTab === "research"
              ? t("admin.dashboard.ragIngest.descriptionInsights")
              : t("admin.dashboard.ragIngest.descriptionRag")
          }
        />
        <div className="border-ink-200 bg-card flex shrink-0 self-start overflow-x-auto rounded-lg border p-1 shadow-sm max-md:grid max-md:grid-cols-4 max-md:gap-1 max-md:self-stretch xl:self-auto">
          {RAG_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={activeTab === tab.value ? "default" : "ghost"}
              className="whitespace-nowrap max-md:min-h-10 max-md:min-w-0 max-md:px-1 max-md:text-xs"
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="max-md:hidden">{t(tab.labelKey)}</span>
              <span className="md:hidden">{t(tab.shortLabelKey)}</span>
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
                <h2 className="text-ink-900 text-sm font-bold">{t("admin.dashboard.ragIngest.contentHeading")}</h2>
                <p className="text-ink-500 mt-1 text-xs">
                  {t("admin.dashboard.ragIngest.contentHint")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  disabled={isIngesting}
                >
                  <RotateCcw className="size-3.5" /> {t("admin.dashboard.ragIngest.resetButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="max-md:hidden"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="size-3.5" /> {t("admin.dashboard.ragIngest.chooseFile")}
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
                    {t("admin.dashboard.ragIngest.releaseToUpload")}
                  </span>
                  <span className="text-ink-500 mt-1 text-[11px]">
                    {t("admin.dashboard.ragIngest.dropLoads")}
                  </span>
                </>
              ) : fileName ? (
                <>
                  <CheckCircle2 className="size-6 text-emerald-500" />
                  <span className="text-ink-700 mt-2 max-w-full truncate text-xs font-semibold">
                    {fileName}
                  </span>
                  <span className="text-ink-500 mt-1 text-[11px] max-md:hidden">{t("admin.dashboard.ragIngest.clickReplace")}</span>
                  <span className="text-ink-500 mt-1 text-[11px] md:hidden">{t("admin.dashboard.ragIngest.tapReplace")}</span>
                </>
              ) : (
                <>
                  <FileText className="text-ink-400 size-6" />
                  <span className="text-ink-600 mt-2 text-xs font-semibold max-md:hidden">
                    {t("admin.dashboard.ragIngest.dropBrowse")}
                  </span>
                  <span className="text-ink-600 mt-2 text-xs font-semibold md:hidden">
                    {t("admin.dashboard.ragIngest.tapChooseFile")}
                  </span>
                  <span className="text-ink-500 mt-1 text-[11px]">
                    {t("admin.dashboard.ragIngest.acceptedTypes")}
                  </span>
                </>
              )}
              <input
                id="rag-file-input"
                aria-label={t("adminUi.ragDocumentFile")}
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
              {t("admin.dashboard.ragIngest.contentLabel")} <span className="text-rose-500">*</span>
            </label>
            <Textarea
              id="rag-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t("admin.dashboard.ragIngest.contentPlaceholder")}
              className="mt-2 min-h-[300px] resize-y text-sm leading-6 max-md:min-h-40 max-md:text-base"
            />
            <p className="text-ink-500 mt-2 text-right text-[11px]">
              {t("admin.dashboard.ragIngest.characters", { chars: content.length.toLocaleString() })}
            </p>
          </section>

          <aside className="border-ink-200 bg-card rounded-xl border p-5 shadow-sm max-md:p-4 sm:p-6">
            <h2 className="text-ink-900 text-sm font-bold">{t("admin.dashboard.ragIngest.metadataHeading")}</h2>
            <p className="text-ink-500 mt-1 text-xs leading-5">
              {t("admin.dashboard.ragIngest.metadataHint")}
            </p>
            <div className="mt-5 space-y-4">
              <Field label={t("admin.dashboard.ragIngest.fieldTitle")} required>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("admin.dashboard.ragIngest.titlePlaceholder")}
                />
              </Field>
              <Field label={t("admin.dashboard.ragIngest.fieldContentType")} required>
                <Select
                  value={contentType}
                  onValueChange={(value) => {
                    const option = RAG_MANUAL_CONTENT_TYPE_OPTIONS.find(([type]) => type === value);
                    if (option) setContentType(option[0]);
                  }}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label={t("admin.dashboard.ragIngest.fieldContentType")}
                    aria-describedby="rag-video-review-hint"
                  >
                    <SelectValue placeholder={t("admin.dashboard.ragIngest.selectContentType")} />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="start"
                    className="z-[100] w-[var(--radix-select-trigger-width)]"
                  >
                    {RAG_MANUAL_CONTENT_TYPE_OPTIONS.map(([value, labelKey]) => (
                      <SelectItem key={value} value={value}>
                        {t(labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span id="rag-video-review-hint" className="text-ink-500 mt-1 block text-[11px] font-normal">
                  {t("admin.dashboard.ragIngest.videoReviewHint")}
                </span>
              </Field>
              <button
                type="button"
                aria-expanded={isMoreOpen}
                onClick={() => setIsMoreOpen((open) => !open)}
                className="text-ink-700 flex min-h-10 w-full items-center justify-between text-xs font-semibold md:hidden"
              >
                {t("admin.dashboard.ragIngest.moreDetails")}
                <ChevronDown className={cn("text-ink-400 size-4 transition-transform", isMoreOpen && "rotate-180")} aria-hidden="true" />
              </button>
              <div className={cn("space-y-4", !isMoreOpen && "max-md:hidden")}>
              <Field label={t("admin.dashboard.ragIngest.fieldSourceId")}>
                <Input
                  value={sourceId}
                  onChange={(event) => setSourceId(event.target.value)}
                  placeholder={
                    isPhone
                      ? t("admin.dashboard.ragIngest.sourceIdPlaceholder")
                      : t("admin.dashboard.ragIngest.sourceIdPlaceholderLong")
                  }
                />
                <span className="text-ink-500 mt-1 block text-[11px] font-normal md:hidden">{t("admin.dashboard.ragIngest.sourceIdHint")}</span>
              </Field>
              <Field label={t("admin.dashboard.ragIngest.fieldSourceType")}>
                <Input
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                  placeholder={t("admin.dashboard.ragIngest.sourceTypePlaceholder")}
                />
              </Field>
              <Field label={t("admin.dashboard.ragIngest.fieldSourceUrl")}>
                <Input
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder={t("admin.dashboard.ragIngest.sourceUrlPlaceholder")}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("admin.dashboard.ragIngest.fieldLanguage")}>
                  <Input
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    placeholder={t("admin.dashboard.ragIngest.languagePlaceholder")}
                  />
                </Field>
                <Field label={t("admin.dashboard.ragIngest.fieldVersion")}>
                  <Input
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    placeholder={t("admin.dashboard.ragIngest.versionPlaceholder")}
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
                disabled={isIngesting || !content.trim() || !title.trim()}
              >
                {isIngesting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t("admin.dashboard.ragIngest.ingestButton")}
              </Button>
              {submittedDocumentId ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                  <p role="status" className="text-ink-700 text-xs">
                    {t("admin.dashboard.ragIngest.ingestSuccess")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedDocumentId(submittedDocumentId);
                      setActiveTab("documents");
                    }}
                  >
                    {t("admin.dashboard.ragIngest.viewDocument")}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-ink-500 mt-3 text-center text-[11px] leading-4">
                  {!title.trim() || !content.trim()
                    ? t("admin.dashboard.ragIngest.hintMissing", {
                        missing: !title.trim()
                          ? !content.trim()
                            ? t("admin.dashboard.ragIngest.hintBoth")
                            : t("admin.dashboard.ragIngest.hintTitle")
                          : t("admin.dashboard.ragIngest.hintContent"),
                      })
                    : t("admin.dashboard.ragIngest.readyHint")}
                </p>
              )}
            </div>
          </aside>
        </div>
        <div className={activeTab === "documents" ? "mt-6 max-md:mt-3" : "hidden"}>
          <AdminRagDocumentsPanel
            isActive={activeTab === "documents"}
            selectedId={selectedDocumentId}
            onSelect={setSelectedDocumentId}
            onIngest={() => setActiveTab("ingest")}
          />
        </div>
        <div className={activeTab === "search" ? "mt-6 max-md:mt-3" : "hidden"}>
          <RagSearchPlayground />
        </div>
      </>
    </>
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
  const { t } = useTranslation("common");
  return (
    <section className="border-ink-200 bg-card mt-6 rounded-xl border p-4 shadow-sm max-md:mt-3 sm:p-5">
      <div className="flex items-start gap-3 max-md:flex-wrap max-md:gap-y-1">
        <div className="bg-ink-100 text-ink-600 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Info className="size-4" />
        </div>
        {/* On a phone the text keeps the row beside the icon and the button drops below it. */}
        <div className="max-md:basis-[calc(100%-2.75rem)]">
          <h2 className="text-ink-900 text-sm font-bold">
            {t("admin.dashboard.ragIngest.guideTitle")}
          </h2>
          <p className="text-ink-500 mt-1 text-xs leading-5">
            {t("admin.dashboard.ragIngest.guideSubtitle")}
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
          {isOpen ? t("admin.dashboard.ragIngest.hideSteps") : t("admin.dashboard.ragIngest.showSteps")}
        </Button>
      </div>
      {isOpen && (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <GuideStep
              number="1"
              title={t("admin.dashboard.ragIngest.guide1Title")}
              text={t("admin.dashboard.ragIngest.guide1Text")}
            />
            <GuideStep
              number="2"
              title={t("admin.dashboard.ragIngest.guide2Title")}
              text={t("admin.dashboard.ragIngest.guide2Text")}
            />
            <GuideStep
              number="3"
              title={t("admin.dashboard.ragIngest.guide3Title")}
              text={t("admin.dashboard.ragIngest.guide3Text")}
            />
            <GuideStep
              number="4"
              title={t("admin.dashboard.ragIngest.guide4Title")}
              text={t("admin.dashboard.ragIngest.guide4Text")}
            />
          </div>
          <div className="border-ink-100 text-ink-500 mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 text-[11px] leading-5">
            <span className="text-ink-800 font-semibold">{t("admin.dashboard.ragIngest.etsyTip")}</span>
            <span>
              {t("admin.dashboard.ragIngest.etsyTipBody")}
            </span>
            <ArrowRight className="text-ink-400 size-3.5" />
            <span>{t("admin.dashboard.ragIngest.storageNote")}</span>
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
