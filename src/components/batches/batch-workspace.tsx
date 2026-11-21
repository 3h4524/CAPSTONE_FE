"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, FileSpreadsheet, PackagePlus, Pencil, Plus, RotateCcw, Search, Shirt, Trash2, Upload, Workflow, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { BatchFormDialog } from "@/components/batches/batch-form-dialog";
import { BatchImportDialog } from "@/components/batches/batch-import-dialog";
import { BatchJobHistoryMenu } from "@/components/batches/batch-job-history-menu";
import { BatchListPanel } from "@/components/batches/batch-list-panel";
import { BatchPicker } from "@/components/batches/batch-picker";
import { BatchProductCard } from "@/components/batches/batch-product-card";
import { BatchProductDialog } from "@/components/batches/batch-product-dialog";
import { BatchSummaryCard } from "@/components/batches/batch-summary-card";
import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { TruncatedTooltip } from "@/components/commons/data-display/truncated-tooltip";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productLineTypes, productTypeLabels, statusDot, statuses, statusLabel } from "@/constants/batches";
import { productServerErrors } from "@/helpers/batch-product-errors";
import { lineTypesText, productLineName } from "@/helpers/product-lines";
import { smoothScrollTo } from "@/helpers/smooth-scroll";
import { useCreateBatch } from "@/hooks/mutations/use-create-batch";
import { useDeleteBatch } from "@/hooks/mutations/use-delete-batch";
import { useDeleteBatchProduct } from "@/hooks/mutations/use-delete-batch-product";
import { useResetBatchProducts } from "@/hooks/mutations/use-reset-batch-products";
import { useSaveBatchProduct } from "@/hooks/mutations/use-save-batch-product";
import { useUpdateBatch } from "@/hooks/mutations/use-update-batch";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";
import { useIsPhone } from "@/hooks/use-is-phone";
import { type BatchFormValues, batchSchema, type ProductFormValues, productSchema } from "@/schemas/batches";
import { usePopupStore } from "@/stores/popup";
import type { Batch, Product, ProductType, SaveProductInput } from "@/types/batches";
import { zodResolver } from "@hookform/resolvers/zod";

// First, last and the pages around the current one; longer runs collapse into a gap, e.g. 1 … 4 5 6 … 12.
const pageNumbers = (current: number, count: number): Array<number | "gap"> => {
  const shown = [...new Set([1, current - 1, current, current + 1, count])].filter((item) => item >= 1 && item <= count).sort((a, b) => a - b);
  return shown.flatMap((item, index) => index > 0 && item - shown[index - 1] > 1 ? ["gap" as const, item] : [item]);
};

const PRODUCTS_PER_PAGE = 10;
const PHONE_PRODUCTS_PER_PAGE = 5;

export const BatchWorkspace = () => {
  const { t, i18n } = useTranslation("common");
  const batchesQuery = useBatches();
  const isPhone = useIsPhone();
  // /batches?batch=<id>&status=<filter> (from the Dashboard) opens that batch with its products filtered.
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get("status");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(searchParams.get("batch"));
  // Read from the polled list so the status badge stays current; falls back to the first batch so the detail panel is never empty.
  const selectedBatch = batchesQuery.data?.find((batch) => batch.id === selectedBatchId) ?? batchesQuery.data?.[0] ?? null;
  const setSelectedBatch = (batch: Batch | null) => setSelectedBatchId(batch?.id ?? null);
  const productsQuery = useBatchProducts(selectedBatch?.id ?? "");
  const [batchDialog, setBatchDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [productDialog, setProductDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importSession, setImportSession] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  // null until the Seller picks a status: the list then opens on Pending, the work still to run, or on All when
  // nothing is pending. A status asked for in the link wins.
  const [filter, setFilter] = useState<string | null>(statuses.find((status) => status === requestedStatus) ?? null);
  const [page, setPage] = useState(1);
  const [batchSearch, setBatchSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  // Bumped on every explicit batch pick, so re-clicking the already-selected card scrolls too. Only needed when the
  // list and the detail panel are stacked; side by side the detail is already in view.
  const [revealTick, setRevealTick] = useState(0);
  useEffect(() => {
    if (revealTick > 0 && detailRef.current && window.matchMedia("(max-width: 1023px)").matches) smoothScrollTo(detailRef.current);
  }, [revealTick]);
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();
  const router = useRouter();
  const saveProduct = useSaveBatchProduct();
  const deleteProduct = useDeleteBatchProduct();
  const resetProducts = useResetBatchProducts();
  const openPopup = usePopupStore((state) => state.openPopup);

  const batchForm = useForm<BatchFormValues>({ resolver: zodResolver(batchSchema), defaultValues: { name: "", description: "", defaultNiche: "", defaultProductType: "" } });
  const productForm = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: { name: "", productType: "tshirt", niche: "", keywords: "", productDescription: "", sourceNotes: "", designText: "", customPrompt: "" } });

  const statusCounts = Object.fromEntries(statuses.map((status) => [status, (productsQuery.data ?? []).filter((product) => statusLabel(product.status).toLowerCase() === status).length])) as Record<(typeof statuses)[number], number>;
  const activeFilter = filter ?? (statusCounts.pending > 0 ? "pending" : "all");
  const products = useMemo(() => (productsQuery.data ?? []).filter((product) => {
    const matchesSearch = `${product.name} ${product.niche ?? ""} ${product.keywords.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (activeFilter === "all" || statusLabel(product.status).toLowerCase() === activeFilter);
  }), [activeFilter, productsQuery.data, search]);
  const pageSize = isPhone ? PHONE_PRODUCTS_PER_PAGE : PRODUCTS_PER_PAGE;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  // Deleting the last product on the last page would otherwise leave an empty page.
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const tableRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    // Bring the table's first row back into view when the pager was reached by scrolling down.
    if (tableRef.current && tableRef.current.getBoundingClientRect().top < 80) smoothScrollTo(tableRef.current, { offset: 96 });
  };
  const pendingProductCount = (productsQuery.data ?? []).filter((product) => product.status === "pending").length;
  const failedProductIds = (productsQuery.data ?? []).filter((product) => product.status === "failed").map((product) => product.id);
  // A failed product can be generated again once it is pending. One still in review can too, when every design of it
  // was rejected; the server refuses it while a design is waiting for a decision.
  const confirmReset = (batchId: string, productIds: string[], title: string) =>
    openPopup({
      title,
      description: t("batches.workspace.resetDescription"),
      positiveLabel: t("batches.workspace.resetToPending"),
      onPositive: () => resetProducts.mutate({ batchId, productIds }),
    });
  const batchCount = batchesQuery.data?.length ?? 0;
  const visibleBatches = (batchesQuery.data ?? []).filter((batch) => `${batch.name} ${batch.description ?? ""} ${batch.defaultNiche ?? ""}`.toLowerCase().includes(batchSearch.trim().toLowerCase()));
  const totalProducts = productsQuery.data?.length ?? 0;
  // A batch imported without keywords would show an empty column; it only appears when there is something in it.
  const hasKeywords = (productsQuery.data ?? []).some((product) => product.keywords.length > 0);
  // Filtering (and the status bar) only tells something once products are spread over more than one status.
  const showStatusFilter = statuses.filter((status) => statusCounts[status] > 0).length > 1;
  // Hiding the filter row must not leave a filter applied that can no longer be cleared. Wait for the
  // products, or a filter opened from a link is dropped before they arrive.
  const hasProducts = productsQuery.data !== undefined;
  useEffect(() => {
    if (hasProducts && !showStatusFilter && filter !== null && filter !== "all") { setFilter(null); setPage(1); }
  }, [hasProducts, showStatusFilter, filter]);
  const selectBatch = (batch: Batch) => { setSelectedBatch(batch); setSearch(""); setFilter(null); setPage(1); setRevealTick((tick) => tick + 1); };
  const confirmRemoveProduct = (batchId: string, product: Product) =>
    openPopup({
      title: t("batches.workspace.removeProductTitle", { name: product.name }),
      description: t("batches.workspace.removeProductDescription"),
      positiveLabel: t("batches.workspace.remove"),
      onPositive: () => deleteProduct.mutate({ batchId, productId: product.id }),
    });
  const openImport = () => { setImportSession((session) => session + 1); setImportDialog(true); };

  const openNewBatch = () => {
    setEditingBatch(null);
    batchForm.reset({ name: "", description: "", defaultNiche: "", defaultProductType: "" });
    setBatchDialog(true);
  };

  const openEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    batchForm.reset({ name: batch.name, description: batch.description ?? "", defaultNiche: batch.defaultNiche ?? "", defaultProductType: (batch.defaultProductType ?? "") as BatchFormValues["defaultProductType"] });
    setBatchDialog(true);
  };

  const openProduct = (product?: Product) => {
    setEditing(product ?? null);
    productForm.reset(product
      ? { name: product.name, productType: product.productType, niche: product.niche ?? "", keywords: product.keywords.join(", "), productDescription: product.productDescription ?? "", sourceNotes: product.sourceNotes ?? "", designText: product.designText ?? "", customPrompt: product.customPrompt ?? "" }
      : { name: "", productType: selectedBatch?.defaultProductType as ProductType || productLineTypes[selectedBatch?.productLine ?? "apparel"][0], niche: selectedBatch?.defaultNiche ?? "", keywords: "", productDescription: "", sourceNotes: "", designText: "", customPrompt: "" });
    setProductDialog(true);
  };

  const submitBatch = batchForm.handleSubmit(async (values) => {
    const input = { name: values.name, description: values.description || undefined, defaultNiche: values.defaultNiche || undefined, defaultProductType: values.defaultProductType as ProductType };
    if (editingBatch) {
      const updated = await updateBatch.mutateAsync({ batchId: editingBatch.id, ...input });
      if (selectedBatch?.id === updated.id) setSelectedBatch(updated);
    } else {
      const created = await createBatch.mutateAsync(input);
      setSelectedBatch(created);
      setBatchSearch("");
      setRevealTick((tick) => tick + 1);
    }
    setBatchDialog(false);
    setEditingBatch(null);
    batchForm.reset();
  });

  const submitDeleteBatch = async () => {
    if (!deletingBatch) return;
    await deleteBatch.mutateAsync(deletingBatch.id);
    if (selectedBatch?.id === deletingBatch.id) setSelectedBatch(null);
    setDeletingBatch(null);
  };

  const toProductInput = (values: ProductFormValues): SaveProductInput => ({
    name: values.name,
    productType: values.productType,
    niche: values.niche,
    keywords: values.keywords.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean).filter((keyword, index, all) => all.indexOf(keyword) === index),
    productDescription: values.productDescription || undefined,
    sourceNotes: values.sourceNotes || undefined,
    designText: values.designText.trim() || undefined,
    customPrompt: values.customPrompt.trim() || undefined,
  });

  const submitProduct = productForm.handleSubmit(async (values) => {
    if (!selectedBatch) return;
    try {
      await saveProduct.mutateAsync({ batchId: selectedBatch.id, productId: editing?.id, ...toProductInput(values) });
    } catch (error) {
      // Marks the field the backend refused (a content-policy hit, a duplicate name, ...) and focuses the first one.
      productServerErrors(error).forEach(({ field, message }, index) =>
        productForm.setError(field ?? "root.server", { type: "server", message }, { shouldFocus: index === 0 && field !== null }));
      return;
    }
    setProductDialog(false);
  });

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-5 md:p-6">
      <PageHeader
        eyebrow={t("batches.workspace.eyebrow")}
        title={t("batches.workspace.title")}
        description={t("batches.workspace.description")}
        actions={
          <>
            <Button variant="ghost" className="text-muted-foreground max-md:hidden" aria-expanded={showHelp} onClick={() => setShowHelp((open) => !open)}><CircleHelp className="mr-2 size-4" />{t("batches.summary.howItWorks")}<ChevronDown className={`ml-1 size-4 transition-transform ${showHelp ? "rotate-180" : ""}`} /></Button>
            <Button size="page-action" onClick={openNewBatch}><Plus className="mr-2 size-4 max-md:mr-0" /><span>{t("batches.workspace.newBatch")}</span></Button>
          </>
        }
      />

      {showHelp && <section className="bg-muted/40 relative rounded-xl border" aria-label={t("batches.workspace.helpAria")}>
        <Button variant="ghost" size="icon" className="text-muted-foreground absolute top-2 right-2 size-7" aria-label={t("batches.workspace.hideHelp")} onClick={() => setShowHelp(false)}><X className="size-4" /></Button>
        <ol className="grid gap-4 px-4 py-4 pr-12 text-sm md:grid-cols-3">
          {[
            [t("batches.workspace.step1Title"), t("batches.workspace.step1Body")],
            [t("batches.workspace.step2Title"), t("batches.workspace.step2Body")],
            [t("batches.workspace.step3Title"), t("batches.workspace.step3Body")],
          ].map(([title, body], index) => <li key={title} className="flex gap-3"><span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{index + 1}</span><div><p className="font-medium">{title}</p><p className="text-muted-foreground mt-0.5">{body}</p></div></li>)}
        </ol>
      </section>}

      {batchesQuery.isLoading ? <p className="text-muted-foreground py-12 text-center">{t("batches.workspace.loading")}</p> : batchesQuery.isError ? <Card><CardContent className="py-12 text-center" role="alert">{t("batches.workspace.loadError")}</CardContent></Card> : batchCount === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center"><div className="bg-primary/10 mb-4 flex size-12 items-center justify-center rounded-xl"><FileSpreadsheet className="text-primary size-6" /></div><h2 className="text-lg font-semibold">{t("batches.workspace.emptyTitle")}</h2><p className="text-muted-foreground mt-2 max-w-md text-sm">{t("batches.workspace.emptyDescription")}</p><Button className="mt-5" onClick={openNewBatch}><Plus className="mr-2 size-4" />{t("batches.workspace.createFirst")}</Button></CardContent></Card>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[20rem_minmax(0,1fr)]">
          {/* Side by side, the zero height keeps the list from growing the row: the detail panel alone sets it, and the list scrolls inside that height. */}
          <aside className="bg-card flex flex-col overflow-hidden rounded-xl border max-md:hidden lg:h-0 lg:min-h-full">
            <BatchListPanel batches={visibleBatches} batchCount={batchCount} search={batchSearch} onSearchChange={setBatchSearch} selectedId={selectedBatch?.id} onSelect={selectBatch} onEdit={openEditBatch} onDelete={setDeletingBatch} onAdd={openNewBatch} />
          </aside>

          {selectedBatch && <section ref={detailRef} className="md:bg-card min-w-0 md:overflow-hidden md:rounded-xl md:border md:shadow-sm lg:min-h-96">
            {isPhone && <div className="space-y-4"><BatchPicker batches={batchesQuery.data ?? []} selected={selectedBatch} onSelect={selectBatch} /><BatchSummaryCard batch={selectedBatch} pendingProductCount={pendingProductCount} hasProducts={totalProducts > 0} onEdit={() => openEditBatch(selectedBatch)} onDelete={() => setDeletingBatch(selectedBatch)} onShowHelp={() => setShowHelp(true)} onImport={openImport} onAddProduct={() => openProduct()} onRun={() => router.push(`/workflows?batch=${selectedBatch.id}`)} /></div>}
            {/* The name with every action on one row, then the details on the next. The buttons are small so all
                of them fit beside the name without squeezing it. */}
            <div className="space-y-2.5 border-b p-4 max-md:hidden sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2"><h2 className="truncate text-xl font-semibold tracking-tight">{selectedBatch.name}</h2></div>
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <BatchJobHistoryMenu batchId={selectedBatch.id} size="sm" />
                  {/* While the batch is empty, the empty state below offers these same two actions, so they are not repeated here. */}
                  {totalProducts > 0 && <>
                    <Button variant="outline" size="sm" onClick={openImport}><Upload className="mr-1.5 size-3.5" />{t("batches.importExcel")}</Button>
                    <Button variant={pendingProductCount > 0 ? "outline" : "default"} size="sm" onClick={() => openProduct()}><Plus className="mr-1.5 size-3.5" />{t("batches.addProduct")}</Button>
                  </>}
                  {pendingProductCount > 0 && <Button size="sm" onClick={() => router.push(`/workflows?batch=${selectedBatch.id}`)}><Workflow className="mr-1.5 size-3.5" />{t("batches.workspace.runInWorkflow", { count: pendingProductCount })}</Button>}
                </div>
              </div>
              {selectedBatch.description && <p className="text-muted-foreground line-clamp-2 text-sm">{selectedBatch.description}</p>}
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {selectedBatch.productLine && <span className="bg-muted inline-flex items-center gap-1 rounded-md px-2 py-1" title={t("batches.workspace.lineTitle", { types: lineTypesText(selectedBatch.productLine, "conjunction") })}><Shirt className="size-3" />{t("batches.workspace.lineLabel")}<span className="text-foreground font-medium">{productLineName(selectedBatch.productLine)}</span></span>}
                <span className="inline-flex items-center gap-1 px-1 py-1"><CalendarDays className="size-3" />{t("batches.workspace.created", { when: formatDistanceToNow(new Date(selectedBatch.createdAt), { addSuffix: true, locale: i18n.language === "vi" ? viLocale : undefined }) })}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 md:p-5">
              {!selectedBatch.productLine && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"><span>This batch has no product line yet. Choose one before adding products or running it: a batch makes one line only.</span><Button variant="outline" size="sm" onClick={() => openEditBatch(selectedBatch)}><Pencil className="mr-1.5 size-3.5" />Choose line</Button></div>}
              {showStatusFilter && <div className="space-y-3">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("batches.workspace.filterStatusAria")}>
                  {(["all", ...statuses] as const).map((status) => {
                    const active = activeFilter === status;
                    const count = status === "all" ? totalProducts : statusCounts[status];
                    // Empty statuses add nothing to filter by, so only the ones holding products are offered.
                    if (status !== "all" && count === 0 && !active) return null;
                    return <button key={status} type="button" role="tab" aria-selected={active} onClick={() => { setFilter(status); setPage(1); }} className={`focus-visible:ring-ring inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${active ? "border-ink-300 bg-ink-200 text-ink-800 font-semibold" : "hover:bg-muted text-muted-foreground"}`}>
                      {status !== "all" && <span className={`size-2 rounded-full ${statusDot[status]}`} aria-hidden />}
                      {status === "all" ? t("batches.statuses.all") : t(`batches.statuses.${statusLabel(status).toLowerCase()}`)}
                      <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-card text-ink-700 shadow-xs" : "bg-muted text-foreground"}`}>{count}</span>
                    </button>;
                  })}
                </div>
              </div>}

              {(totalProducts > 8 || search || failedProductIds.length > 0) && <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{(totalProducts > 8 || search) && <div className="relative min-w-0 flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4"/><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("batches.workspace.searchPlaceholder")} className="pl-9" aria-label={t("batches.workspace.searchAria")}/></div>}{failedProductIds.length > 0 && <Button variant="outline" disabled={resetProducts.isPending} onClick={() => confirmReset(selectedBatch.id, failedProductIds, t("batches.workspace.resetFailedTitle", { count: failedProductIds.length }))}><RotateCcw className="mr-2 size-4" />{t("batches.workspace.resetFailed", { count: failedProductIds.length })}</Button>}</div>}

              {productsQuery.isLoading ? <p className="text-muted-foreground py-10 text-center">{t("batches.workspace.loadingProducts")}</p> : productsQuery.isError ? <p role="alert" className="text-destructive py-10 text-center">{t("batches.workspace.loadProductsError")}</p> : totalProducts === 0 ? (
                <div className="max-md:bg-card rounded-xl border border-dashed p-6 sm:p-10">
                  <div className="text-center"><div className="bg-primary/10 mx-auto mb-3 flex size-11 items-center justify-center rounded-xl"><PackagePlus className="text-primary size-5" /></div><p className="font-semibold">{t("batches.workspace.emptyBatchTitle")}</p><p className="text-muted-foreground mt-1 text-sm">{t("batches.workspace.emptyBatchDescription")}</p></div>
                  <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => openProduct()} className="hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"><Plus className="text-primary size-5" /><p className="mt-3 text-sm font-semibold">{t("batches.addProduct")}</p><p className="text-muted-foreground mt-1 text-xs">{t("batches.workspace.addManuallyHint")}</p></button>
                    <button type="button" onClick={openImport} className="hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"><FileSpreadsheet className="text-primary size-5" /><p className="mt-3 text-sm font-semibold">{t("batches.importExcel")}</p><p className="text-muted-foreground mt-1 text-xs">{t("batches.workspace.importHint")}</p></button>
                  </div>
                  <p className="text-muted-foreground mt-4 text-center text-xs">{t("batches.workspace.noSpreadsheet")} <a href="/templates/product-import-template.xlsx" download className="text-primary font-medium underline-offset-4 hover:underline">{t("batches.workspace.downloadTemplate")}</a></p>
                </div>
              ) : products.length === 0 ? (
                <div className="max-md:bg-card rounded-xl border border-dashed py-12 text-center"><p className="font-medium">{t("batches.workspace.noMatchTitle")}</p><p className="text-muted-foreground mt-1 text-sm">{t("batches.workspace.noMatchHint")}</p><Button variant="link" size="sm" className="mt-1" onClick={() => { setSearch(""); setFilter("all"); setPage(1); }}>{t("batches.workspace.clearFilters")}</Button></div>
              ) : isPhone ? <>
                <ul id="batch-products" className="scroll-mt-3 space-y-3" aria-label={t("batches.workspace.productsAria")}>
                  {visibleProducts.map((product) => (
                    <BatchProductCard
                      key={product.id}
                      product={product}
                      typeLabel={t(`batches.productTypes.${product.productType}`, { defaultValue: productTypeLabels[product.productType] })}
                      statusLabel={t(`batches.statuses.${statusLabel(product.status).toLowerCase()}`)}
                      isBusy={deleteProduct.isPending || resetProducts.isPending}
                      onEdit={product.status === "pending" ? () => openProduct(product) : undefined}
                      onDelete={product.status === "pending" ? () => confirmRemoveProduct(selectedBatch.id, product) : undefined}
                      onReset={product.status === "failed" || product.status === "image_review_required" ? () => confirmReset(selectedBatch.id, [product.id], t("batches.workspace.resetOneTitle", { name: product.name })) : undefined}
                    />
                  ))}
                </ul>
                <p className="text-muted-foreground text-center text-xs tabular-nums">{t("batches.workspace.showingProducts", { from: (currentPage - 1) * pageSize + 1, to: (currentPage - 1) * pageSize + visibleProducts.length, total: products.length })}</p>
                <PhonePager page={currentPage} pageCount={pageCount} onPageChange={setPage} label={t("batches.workspace.productPages")} anchorId="batch-products" />
              </> : <>
                <div ref={tableRef} className="overflow-hidden rounded-lg border"><Table className="table-fixed"><TableHeader className="bg-muted/50"><TableRow><TableHead className={hasKeywords ? "w-[36%]" : "w-[44%]"}>{t("batches.table.product")}</TableHead><TableHead className={`hidden sm:table-cell ${hasKeywords ? "w-[18%]" : "w-[22%]"}`}>{t("batches.table.niche")}</TableHead>{hasKeywords && <TableHead className="hidden w-[22%] lg:table-cell">{t("batches.table.keywords")}</TableHead>}<TableHead>{t("batches.table.status")}</TableHead><TableHead className="w-28"><span className="sr-only">{t("batches.table.actions")}</span></TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <TableRow key={product.id} className="group/row">
                  <TableCell className="font-medium"><TruncatedTooltip value={product.name} /><span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-normal max-sm:flex-wrap max-sm:whitespace-normal"><span className="shrink-0">{productTypeLabels[product.productType]}</span>{product.customPrompt && <><span aria-hidden>·</span><span className="sm:shrink-0">{t("batches.product.ownImagePrompt")}</span></>}{product.productDescription && <><span aria-hidden>·</span><TruncatedTooltip value={product.productDescription} className="min-w-0 truncate" /></>}</span></TableCell>
                  <TableCell className="hidden sm:table-cell"><TruncatedTooltip value={product.niche || "—"} /></TableCell>
                  {hasKeywords && <TableCell className="hidden lg:table-cell"><div className="flex min-w-0 items-center gap-1" title={product.keywords.join(", ")}>{product.keywords.slice(0, 2).map((keyword) => <span key={keyword} className="bg-muted min-w-0 truncate rounded px-1.5 py-0.5 text-xs">{keyword}</span>)}{product.keywords.length > 2 && <span className="text-muted-foreground shrink-0 px-1 py-0.5 text-xs">+{product.keywords.length - 2}</span>}</div></TableCell>}
                  <TableCell><StatusBadge status={product.status}>{t(`batches.statuses.${statusLabel(product.status).toLowerCase()}`)}</StatusBadge></TableCell>
                  <TableCell className="text-right">{product.status === "pending" && <div className="flex justify-end gap-0.5 transition-opacity [@media(hover:hover)]:opacity-35 [@media(hover:hover)]:group-focus-within/row:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100"><Button variant="ghost" size="icon" className="size-8" aria-label={t("batches.product.editAria", { name: product.name })} onClick={() => openProduct(product)}><Pencil className="size-4"/></Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-8" aria-label={t("batches.product.deleteAria", { name: product.name })} disabled={deleteProduct.isPending} onClick={() => confirmRemoveProduct(selectedBatch.id, product)}><Trash2 className="size-4"/></Button></div>}{(product.status === "failed" || product.status === "image_review_required") && <Button variant="outline" size="sm" className="bg-card text-foreground h-8 gap-2 rounded-full pr-1 pl-3 text-xs font-medium shadow-none" title={t("batches.workspace.setBackToPending")} aria-label={t("batches.product.resetAria", { name: product.name })} disabled={resetProducts.isPending} onClick={() => confirmReset(selectedBatch.id, [product.id], t("batches.workspace.resetOneTitle", { name: product.name }))}>{t("batches.product.reset")}<span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full"><RotateCcw className="size-3.5" /></span></Button>}</TableCell>
                </TableRow>)}</TableBody></Table></div>
                {pageCount > 1 && <nav aria-label={t("batches.workspace.productPages")} className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">{t("batches.workspace.showingProducts", { from: (currentPage - 1) * pageSize + 1, to: Math.min(currentPage * pageSize, products.length), total: products.length })}</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="outline" size="icon" className="size-8" aria-label={t("batches.workspace.prevPage")} disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button>
                    {pageNumbers(currentPage, pageCount).map((item, index) => item === "gap"
                      ? <span key={`gap-${index}`} className="text-muted-foreground w-8 text-center" aria-hidden>…</span>
                      : <Button key={item} variant={item === currentPage ? "default" : "ghost"} size="icon" className="size-8 tabular-nums" aria-label={t("batches.workspace.pageNumber", { number: item })} aria-current={item === currentPage ? "page" : undefined} onClick={() => goToPage(item)}>{item}</Button>)}
                    <Button variant="outline" size="icon" className="size-8" aria-label={t("batches.workspace.nextPage")} disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)}><ChevronRight className="size-4" /></Button>
                  </div>
                </nav>}
              </>}
            </div>
          </section>}
        </div>
      )}


      <BatchFormDialog open={batchDialog} onOpenChange={(open) => { setBatchDialog(open); if (!open) setEditingBatch(null); }} form={batchForm} isEditing={!!editingBatch} isCreating={createBatch.isPending} isSaving={updateBatch.isPending} onSubmit={submitBatch} />

      <Dialog open={!!deletingBatch} onOpenChange={(open) => { if (!open) setDeletingBatch(null); }}><DialogContent><DialogHeader><DialogTitle>{t("batches.deleteBatchTitle", { name: deletingBatch?.name })}</DialogTitle><DialogDescription>{t("batches.deleteBatchDescription")}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeletingBatch(null)}>{t("batches.cancel")}</Button><Button variant="destructive" disabled={deleteBatch.isPending} onClick={() => void submitDeleteBatch()}>{deleteBatch.isPending ? t("batches.deleting") : t("batches.deleteBatch")}</Button></DialogFooter></DialogContent></Dialog>

      <BatchProductDialog productLine={selectedBatch?.productLine ?? null} open={productDialog} onOpenChange={setProductDialog} form={productForm} isEditing={!!editing} isSaving={saveProduct.isPending} onSubmit={submitProduct} />

      <BatchImportDialog key={importSession} batchId={selectedBatch?.id} productLine={selectedBatch?.productLine ?? null} open={importDialog} onOpenChange={setImportDialog} />
    </div>
  );
};
