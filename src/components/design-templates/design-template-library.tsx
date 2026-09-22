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
import { useAuthStore } from "@/stores/auth";
import type {
  DesignTemplateFilters,
  DesignTemplateScope,
  DesignTemplateSummary,
} from "@/types/design-template";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 12;
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
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      nicheCategory: niche === ALL_FILTER ? undefined : niche,
      artStyle: artStyle === ALL_FILTER ? undefined : artStyle,
      scope,
    }),
    [artStyle, debouncedSearch, niche, pageNumber, scope]
  );
  const templatesQuery = useDesignTemplates(filters, Boolean(user));
  const cloneMutation = useCloneDesignTemplate();
  const deleteMutation = useDeleteDesignTemplate();
  const detailId = searchParams.get("template");
  const retrying = optionsQuery.isFetching || templatesQuery.isFetching;
  const isSystemTab = scope === "system";

  useEffect(() => {
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
    <div className="flex flex-1 flex-col text-[#161c22]">
      <main className="mx-auto w-full max-w-[1380px] px-4 pt-8 pb-10 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-slate-200 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-bold tracking-[0.17em] text-slate-500 uppercase">Creative library</p>
            <h1 className="font-display mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Start with a structure. Make the artwork yours.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore production-ready prompt systems or manage the reusable templates in your private workspace.
            </p>
          </div>
          <Button size="lg" className="min-h-11 self-start px-5 lg:self-auto" onClick={() => router.push("/design-templates/new")}>
            <Plus aria-hidden="true" />New personal template
          </Button>
        </header>

        <section className="mt-6" aria-label="Template library controls">
          <div
            className="grid gap-1.5 rounded-[20px] border border-slate-200 bg-slate-100/80 p-1.5 sm:grid-cols-2 lg:max-w-3xl"
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
                    "flex min-h-18 items-center gap-3 rounded-[15px] px-4 py-3 text-left transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none active:translate-y-px",
                    selected
                      ? "bg-[#273750] text-white shadow-[0_10px_24px_rgba(39,55,80,0.18)]"
                      : "text-slate-700 hover:bg-white hover:text-slate-950"
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
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                      selected
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold sm:text-base">{tab.label}</span>
                    <span className={cn("mt-0.5 block text-xs", selected ? "text-slate-300" : "text-slate-500")}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {isSystemTab ? "Explore the system collection" : "Manage your personal collection"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isSystemTab
                  ? "View curated prompt structures and clone the ones that fit your next product."
                  : "Edit, review, or remove templates owned by your account."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px_190px] xl:w-[720px]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isSystemTab ? "Search system templates" : "Search my templates"}
                  aria-label={isSystemTab ? "Search system templates" : "Search personal templates"}
                  className="min-h-10 border-slate-300 bg-white pl-10"
                />
              </div>
              <Select value={niche} onValueChange={selectNiche}>
                <SelectTrigger className="min-h-10 w-full border-slate-300 bg-white">
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
                <SelectTrigger className="min-h-10 w-full border-slate-300 bg-white">
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
            <section className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading templates">
              {Array.from({ length: 6 }, (_, index) => <DesignTemplateCardSkeleton key={index} />)}
            </section>
          ) : templatesQuery.isError || optionsQuery.isError ? (
            <section className="mt-7 flex min-h-80 flex-col items-center justify-center rounded-[22px] border border-slate-200 bg-white p-8 text-center">
              <Layers3 className="size-9 text-slate-400" aria-hidden="true" />
              <h2 className="font-display mt-4 text-xl font-semibold">The library could not be loaded</h2>
              <p className="mt-2 text-sm text-slate-500">Check your connection and try again.</p>
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
            <section className="mt-7 flex min-h-80 flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-[#fafaf8] p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-white shadow-sm">
                {hasFilters ? (
                  <SlidersHorizontal className="size-5 text-slate-500" aria-hidden="true" />
                ) : isSystemTab ? (
                  <Layers3 className="size-5 text-slate-500" aria-hidden="true" />
                ) : (
                  <FolderOpen className="size-5 text-slate-500" aria-hidden="true" />
                )}
              </span>
              <h2 className="font-display mt-4 text-xl font-semibold">
                {hasFilters
                  ? "No templates match these filters"
                  : isSystemTab
                    ? "No system templates are available"
                    : "Create your first personal template"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
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
              <div className="mt-7 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-950">{data.totalCount}</span>{" "}
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
              <nav className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5" aria-label="Template pages">
                <p className="text-xs text-slate-500">Page {data.pageNumber} of {Math.max(1, data.totalPages)}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
                    <ChevronLeft aria-hidden="true" />Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={pageNumber >= data.totalPages} onClick={() => goToPage(pageNumber + 1)}>
                    Next<ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </nav>
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
