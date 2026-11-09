"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { DeleteDesignTemplateDialog } from "@/components/design-templates/delete-design-template-dialog";
import { DesignTemplateCard } from "@/components/design-templates/design-template-card";
import { DesignTemplateCardSkeleton } from "@/components/design-templates/design-template-card-skeleton";
import { DesignTemplateDetailDialog } from "@/components/design-templates/design-template-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/helpers/toast";
import { useCloneDesignTemplate } from "@/hooks/mutations/use-clone-design-template";
import { useDeleteDesignTemplate } from "@/hooks/mutations/use-delete-design-template";
import { useDesignTemplateOptions } from "@/hooks/queries/use-design-template-options";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useAuthStore } from "@/stores/auth";
import type {
  DesignTemplateFilters,
  DesignTemplateScope,
  DesignTemplateSummary,
} from "@/types/design-template";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;
const PHONE_PAGE_SIZE = 5;
const ALL_FILTER = "all";
const LIBRARY_TABS: Array<{
  value: DesignTemplateScope;
  label: string;
  description: string;
  icon: typeof Layers3;
}> = [
  {
    value: "system",
    label: "System templates",
    description: "Curated foundations ready to clone",
    icon: Layers3,
  },
  {
    value: "personal",
    label: "My templates",
    description: "Your editable creative workspace",
    icon: FolderOpen,
  },
];

export function DesignTemplateLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isPhone = useIsPhone();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") ?? "");
  const [scope, setScope] = useState<DesignTemplateScope>(readScope(searchParams.get("scope")));
  const [niche, setNiche] = useState(searchParams.get("nicheCategory") ?? ALL_FILTER);
  const [artStyle, setArtStyle] = useState(searchParams.get("artStyle") ?? ALL_FILTER);
  const [pageNumber, setPageNumber] = useState(readPage(searchParams.get("pageNumber")));
  const [deletingTemplate, setDeletingTemplate] = useState<DesignTemplateSummary | null>(null);

  const optionsQuery = useDesignTemplateOptions(Boolean(user));
  const filters = useMemo<DesignTemplateFilters>(
    () => ({
      pageNumber,
      pageSize: isPhone ? PHONE_PAGE_SIZE : PAGE_SIZE,
      search: debouncedSearch || undefined,
      nicheCategory: niche === ALL_FILTER ? undefined : niche,
      artStyle: artStyle === ALL_FILTER ? undefined : artStyle,
      scope,
    }),
    [artStyle, debouncedSearch, isPhone, niche, pageNumber, scope]
  );
  const templatesQuery = useDesignTemplates(filters, Boolean(user));
  const cloneMutation = useCloneDesignTemplate();
  const deleteMutation = useDeleteDesignTemplate();
  const detailId = searchParams.get("template");
  const retrying = optionsQuery.isFetching || templatesQuery.isFetching;
  const isSystemTab = scope === "system";

  useEffect(() => {
    // Runs on load too, where it would send a link to page 2, or a quick tap on Next, back to page 1.
    if (search.trim() === debouncedSearch) return;
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPageNumber(1);
      updateUrl({ search: search.trim(), pageNumber: "1" });
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        value === ALL_FILTER ||
        (key === "scope" && value === "system") ||
        (key === "pageNumber" && value === "1")
      ) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const selectScope = (nextScope: DesignTemplateScope) => {
    setScope(nextScope);
    setPageNumber(1);
    updateUrl({ scope: nextScope, pageNumber: "1", template: null });
  };

  const selectNiche = (value: string) => {
    setNiche(value);
    setPageNumber(1);
    updateUrl({ nicheCategory: value, pageNumber: "1" });
  };

  const selectArtStyle = (value: string) => {
    setArtStyle(value);
    setPageNumber(1);
    updateUrl({ artStyle: value, pageNumber: "1" });
  };

  const goToPage = (page: number) => {
    setPageNumber(page);
    updateUrl({ pageNumber: String(page) });
  };

  const openDetail = (id: string) => updateUrl({ template: id });
  const closeDetail = () => updateUrl({ template: null });

  const cloneTemplate = (id: string) => {
    cloneMutation.mutate(id, {
      onSuccess: (template) => {
        showToast("success", "Template cloned. Customize your copy.");
        router.push(`/design-templates/${template.id}/edit?cloned=1`);
      },
    });
  };

  const deleteTemplate = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setDeletingTemplate(null);
        showToast("success", "Template deleted.");
      },
    });
  };

  const retryLibrary = async () => {
    await optionsQuery.refetch();
    await templatesQuery.refetch();
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setNiche(ALL_FILTER);
    setArtStyle(ALL_FILTER);
    setPageNumber(1);
    router.replace(isSystemTab ? pathname : `${pathname}?scope=${scope}`, { scroll: false });
  };

  const hasFilters = Boolean(debouncedSearch) || niche !== ALL_FILTER || artStyle !== ALL_FILTER;
  const data = templatesQuery.data;

  return (
    <div className="text-foreground w-full min-w-0 md:p-6">
      <main className="w-full min-w-0">
        <header className="border-ink-200 grid gap-6 border-b pb-7 max-md:flex max-md:items-center max-md:justify-between max-md:gap-3 max-md:border-0 max-md:pb-0 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-ink-500 text-[11px] font-bold tracking-[0.17em] uppercase max-md:hidden">Creative library</p>
            <h1 className="font-display text-ink-900 mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] max-md:mt-0 max-md:text-xl max-md:tracking-tight sm:text-4xl">
              <span className="md:hidden">Design templates</span>
              <span className="max-md:hidden">Start with a structure. Make the artwork yours.</span>
            </h1>
            <p className="text-ink-600 mt-3 max-w-2xl text-sm leading-6 max-md:hidden sm:text-base">
              Explore production-ready prompt systems or manage the reusable templates in your private workspace.
            </p>
          </div>
          <Button size="page-action" className="self-start max-md:shrink-0 md:h-11 md:min-h-11 md:px-5 md:text-base lg:self-auto" onClick={() => router.push("/design-templates/new")}>
            <Plus aria-hidden="true" />
            <span>
              New<span className="max-md:hidden"> personal template</span>
            </span>
          </Button>
        </header>

        <section className="mt-6 max-md:mt-4" aria-label="Template library controls">
          <div
            className="border-ink-200 bg-ink-100/80 grid grid-cols-2 gap-1.5 rounded-[20px] border p-1.5 lg:max-w-3xl"
            role="tablist"
            aria-label="Template library"
          >
            {LIBRARY_TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = scope === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  id={`${tab.value}-templates-tab`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${tab.value}-templates-panel`}
                  tabIndex={selected ? 0 : -1}
                  className={cn(
                    "focus-visible:ring-primary/20 flex min-h-18 items-center gap-3 rounded-[15px] px-4 py-3 text-left transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:ring-3 focus-visible:outline-none active:translate-y-px max-md:min-h-12 max-md:gap-2 max-md:px-2.5 max-md:py-2",
                    selected
                      ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(39,55,80,0.18)]"
                      : "text-ink-700 hover:bg-card hover:text-ink-900"
                  )}
                  onClick={() => selectScope(tab.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

                    event.preventDefault();
                    const nextScope = tab.value === "system" ? "personal" : "system";
                    selectScope(nextScope);
                    window.requestAnimationFrame(() => {
                      document.getElementById(`${nextScope}-templates-tab`)?.focus();
                    });
                  }}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border max-md:size-8 max-md:rounded-lg",
                      selected
                        ? "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground"
                        : "border-ink-200 bg-card text-ink-600"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold sm:text-base">
                      {tab.value === "system" ? (
                        <>
                          System<span className="max-md:hidden"> templates</span>
                        </>
                      ) : (
                        tab.label
                      )}
                    </span>
                    <span className={cn("mt-0.5 block text-xs max-md:hidden", selected ? "text-primary-foreground/70" : "text-ink-500")}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 max-md:mt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-md:hidden">
              <p className="text-ink-900 text-sm font-semibold">
                {isSystemTab ? "Explore the system collection" : "Manage your personal collection"}
              </p>
              <p className="text-ink-500 mt-1 text-xs">
                {isSystemTab
                  ? "View curated prompt structures and clone the ones that fit your next product."
                  : "Edit, review, or remove templates owned by your account."}
              </p>
            </div>
            <div className="grid gap-2 max-sm:grid-cols-2 sm:grid-cols-[minmax(220px,1fr)_190px_190px] xl:w-[720px]">
              <div className="relative max-sm:col-span-2">
                <Search className="text-ink-500 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden="true" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isSystemTab ? "Search system templates" : "Search my templates"}
                  aria-label={isSystemTab ? "Search system templates" : "Search personal templates"}
                  className="border-ink-300 bg-card min-h-10 pl-10"
                />
              </div>
              <Select value={niche} onValueChange={selectNiche}>
                <SelectTrigger className="border-ink-300 bg-card min-h-10 w-full min-w-0">
                  <SelectValue placeholder="All niches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All niches</SelectItem>
                  {optionsQuery.data?.niches.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={artStyle} onValueChange={selectArtStyle}>
                <SelectTrigger className="border-ink-300 bg-card min-h-10 w-full min-w-0">
                  <SelectValue placeholder="All styles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All styles</SelectItem>
                  {optionsQuery.data?.artStyles.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div
          id={`${scope}-templates-panel`}
          role="tabpanel"
          aria-labelledby={`${scope}-templates-tab`}
        >
          {templatesQuery.isPending || optionsQuery.isPending ? (
            <section className="mt-7 grid gap-5 max-md:mt-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading templates">
              {Array.from({ length: 6 }, (_, index) => <DesignTemplateCardSkeleton key={index} />)}
            </section>
          ) : templatesQuery.isError || optionsQuery.isError ? (
            <section className="border-ink-200 bg-card mt-7 flex min-h-80 flex-col items-center justify-center rounded-[22px] border p-8 text-center">
              <Layers3 className="text-ink-400 size-9" aria-hidden="true" />
              <h2 className="font-display mt-4 text-xl font-semibold">The library could not be loaded</h2>
              <p className="text-ink-500 mt-2 text-sm">Check your connection and try again.</p>
              <Button
                variant="outline"
                className="mt-5 min-w-36"
                disabled={retrying}
                aria-busy={retrying}
                onClick={() => void retryLibrary()}
              >
                <RefreshCw className={cn("size-4", retrying && "animate-spin")} aria-hidden="true" />
                <span aria-live="polite">{retrying ? "Retrying..." : "Retry"}</span>
              </Button>
            </section>
          ) : !data || data.items.length === 0 ? (
            <section className="border-ink-300 bg-ink-50 mt-7 flex min-h-80 flex-col items-center justify-center rounded-[22px] border border-dashed p-8 text-center">
              <span className="bg-card flex size-12 items-center justify-center rounded-xl shadow-sm">
                {hasFilters ? (
                  <SlidersHorizontal className="text-ink-500 size-5" aria-hidden="true" />
                ) : isSystemTab ? (
                  <Layers3 className="text-ink-500 size-5" aria-hidden="true" />
                ) : (
                  <FolderOpen className="text-ink-500 size-5" aria-hidden="true" />
                )}
              </span>
              <h2 className="font-display mt-4 text-xl font-semibold">
                {hasFilters
                  ? "No templates match these filters"
                  : isSystemTab
                    ? "No system templates are available"
                    : "Create your first personal template"}
              </h2>
              <p className="text-ink-500 mt-2 max-w-md text-sm leading-6">
                {hasFilters
                  ? "Broaden the search or reset the filters to see more prompt systems."
                  : isSystemTab
                    ? "The curated collection is currently empty. Refresh the catalog or try again shortly."
                    : "Build a reusable prompt structure you can edit for your own product catalog."}
              </p>
              {hasFilters ? (
                <Button variant="outline" className="mt-5" onClick={clearFilters}><X aria-hidden="true" />Clear filters</Button>
              ) : isSystemTab ? (
                <Button variant="outline" className="mt-5" disabled={templatesQuery.isFetching} onClick={() => void templatesQuery.refetch()}>
                  <RefreshCw className={cn("size-4", templatesQuery.isFetching && "animate-spin")} aria-hidden="true" />
                  Refresh catalog
                </Button>
              ) : (
                <Button className="mt-5" onClick={() => router.push("/design-templates/new")}><Plus aria-hidden="true" />Create template</Button>
              )}
            </section>
          ) : (
            <>
              <div className="mt-7 flex items-center justify-between gap-4 max-md:mt-4">
                <p className="text-ink-600 text-sm">
                  <span className="text-ink-900 font-semibold">{data.totalCount}</span>{" "}
                  {isSystemTab ? "system" : "personal"} template{data.totalCount === 1 ? "" : "s"}
                </p>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="hover:translate-y-0" onClick={clearFilters}>
                    <X aria-hidden="true" />Clear filters
                  </Button>
                )}
              </div>
              <section className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label={isSystemTab ? "System templates" : "Personal templates"}>
                {data.items.map((template) => (
                  <DesignTemplateCard
                    key={template.id}
                    template={template}
                    cloning={cloneMutation.isPending && cloneMutation.variables === template.id}
                    onView={openDetail}
                    onClone={cloneTemplate}
                    onEdit={(id) => router.push(`/design-templates/${id}/edit`)}
                    onDelete={setDeletingTemplate}
                  />
                ))}
              </section>
              {isPhone ? (
                <div className="mt-4">
                  <PhonePager page={data.pageNumber} pageCount={data.totalPages} onPageChange={goToPage} label="Template pages" />
                </div>
              ) : (
              <nav className="border-ink-200 mt-8 flex items-center justify-between border-t pt-5" aria-label="Template pages">
                <p className="text-ink-500 text-xs">Page {data.pageNumber} of {Math.max(1, data.totalPages)}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
                    <ChevronLeft aria-hidden="true" />Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={pageNumber >= data.totalPages} onClick={() => goToPage(pageNumber + 1)}>
                    Next<ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </nav>
              )}
            </>
          )}
        </div>
      </main>

      <DesignTemplateDetailDialog
        templateId={detailId}
        cloning={cloneMutation.isPending}
        onClose={closeDetail}
        onClone={cloneTemplate}
        onEdit={(id) => router.push(`/design-templates/${id}/edit`)}
      />
      <DeleteDesignTemplateDialog
        template={deletingTemplate}
        deleting={deleteMutation.isPending}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={deleteTemplate}
      />
    </div>
  );
}

function readScope(value: string | null): DesignTemplateScope {
  return value === "personal" ? "personal" : "system";
}

function readPage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
