"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, FileSpreadsheet, PackagePlus, Pencil, Plus, RotateCcw, Search, Shirt, Trash2, Upload, Workflow, X } from "lucide-react";
import { useForm } from "react-hook-form";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productTypeLabels, statusDot, statuses, statusLabel } from "@/constants/batches";
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
      description: "The next run generates new designs for it. Designs made earlier are kept.",
      positiveLabel: "Reset to pending",
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
      title: `Remove “${product.name}”?`,
      description: "This removes the product from the batch. Only pending products can be removed.",
      positiveLabel: "Remove",
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
      : { name: "", productType: selectedBatch?.defaultProductType as ProductType || "tshirt", niche: selectedBatch?.defaultNiche ?? "", keywords: "", productDescription: "", sourceNotes: "", designText: "", customPrompt: "" });
    setProductDialog(true);
  };

  const submitBatch = batchForm.handleSubmit(async (values) => {
    const input = { name: values.name, description: values.description || undefined, defaultNiche: values.defaultNiche || undefined, defaultProductType: values.defaultProductType || undefined };
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
    await saveProduct.mutateAsync({ batchId: selectedBatch.id, productId: editing?.id, ...toProductInput(values) });
    setProductDialog(false);
  });

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-5 md:p-6">
      <header className="flex flex-col justify-between gap-4 max-md:flex-row max-md:items-center sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase max-md:hidden">Product management</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight max-md:mt-0 max-md:text-xl">Product batches</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm max-md:hidden">Prepare and track product inputs before sending them into the creation workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button variant="ghost" className="text-muted-foreground max-md:hidden" aria-expanded={showHelp} onClick={() => setShowHelp((open) => !open)}><CircleHelp className="mr-2 size-4" />How it works<ChevronDown className={`ml-1 size-4 transition-transform ${showHelp ? "rotate-180" : ""}`} /></Button>
          <Button size="page-action" onClick={openNewBatch}><Plus className="mr-2 size-4 max-md:mr-0" /><span>New<span className="max-md:hidden"> batch</span></span></Button>
        </div>
      </header>

      {showHelp && <section className="bg-muted/40 relative rounded-xl border" aria-label="How product batches work">
        <Button variant="ghost" size="icon" className="text-muted-foreground absolute top-2 right-2 size-7" aria-label="Hide how it works" onClick={() => setShowHelp(false)}><X className="size-4" /></Button>
        <ol className="grid gap-4 px-4 py-4 pr-12 text-sm md:grid-cols-3">
          {[
            ["Add product inputs", "Enter a product name, type, niche and keywords. Imported or manually added products stay pending."],
            ["Review the batch", "Check each product before approving. A niche describes its target market, such as hiking enthusiasts."],
            ["Run in a workflow", "Open the batch in a workflow, choose the design template, style and mock-ups, then press Run. Products lock while their job is queued."],
          ].map(([title, body], index) => <li key={title} className="flex gap-3"><span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">{index + 1}</span><div><p className="font-medium">{title}</p><p className="text-muted-foreground mt-0.5">{body}</p></div></li>)}
        </ol>
      </section>}

      {batchesQuery.isLoading ? <p className="text-muted-foreground py-12 text-center">Loading batches…</p> : batchesQuery.isError ? <Card><CardContent className="py-12 text-center" role="alert">Could not load batches. Please try again.</CardContent></Card> : batchCount === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center py-16 text-center"><div className="bg-primary/10 mb-4 flex size-12 items-center justify-center rounded-xl"><FileSpreadsheet className="text-primary size-6" /></div><h2 className="text-lg font-semibold">Start with a product batch</h2><p className="text-muted-foreground mt-2 max-w-md text-sm">A batch keeps related product inputs together. You can add products manually or import them from Excel.</p><Button className="mt-5" onClick={openNewBatch}><Plus className="mr-2 size-4" />Create your first batch</Button></CardContent></Card>
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
                    <Button variant="outline" size="sm" onClick={openImport}><Upload className="mr-1.5 size-3.5" />Import Excel</Button>
                    <Button variant={pendingProductCount > 0 ? "outline" : "default"} size="sm" onClick={() => openProduct()}><Plus className="mr-1.5 size-3.5" />Add product</Button>
                  </>}
                  {pendingProductCount > 0 && <Button size="sm" onClick={() => router.push(`/workflows?batch=${selectedBatch.id}`)}><Workflow className="mr-1.5 size-3.5" />Run in workflow ({pendingProductCount})</Button>}
                </div>
              </div>
              {selectedBatch.description && <p className="text-muted-foreground line-clamp-2 text-sm">{selectedBatch.description}</p>}
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {selectedBatch.defaultProductType && <span className="bg-muted inline-flex items-center gap-1 rounded-md px-2 py-1"><Shirt className="size-3" />Type: <span className="text-foreground font-medium">{productTypeLabels[selectedBatch.defaultProductType as ProductType] ?? selectedBatch.defaultProductType}</span></span>}
                <span className="inline-flex items-center gap-1 px-1 py-1"><CalendarDays className="size-3" />Created {formatDistanceToNow(new Date(selectedBatch.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 md:p-5">
              {showStatusFilter && <div className="space-y-3">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter products by status">
                  {(["all", ...statuses] as const).map((status) => {
                    const active = activeFilter === status;
                    const count = status === "all" ? totalProducts : statusCounts[status];
                    // Empty statuses add nothing to filter by, so only the ones holding products are offered.
                    if (status !== "all" && count === 0 && !active) return null;
                    return <button key={status} type="button" role="tab" aria-selected={active} onClick={() => { setFilter(status); setPage(1); }} className={`focus-visible:ring-ring inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none ${active ? "border-ink-300 bg-ink-200 text-ink-800 font-semibold" : "hover:bg-muted text-muted-foreground"}`}>
                      {status !== "all" && <span className={`size-2 rounded-full ${statusDot[status]}`} aria-hidden />}
                      {status === "all" ? "All" : statusLabel(status)}
                      <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-card text-ink-700 shadow-xs" : "bg-muted text-foreground"}`}>{count}</span>
                    </button>;
                  })}
                </div>
              </div>}

              {(totalProducts > 8 || search || failedProductIds.length > 0) && <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{(totalProducts > 8 || search) && <div className="relative min-w-0 flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4"/><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products, niche or keywords" className="pl-9" aria-label="Search products"/></div>}{failedProductIds.length > 0 && <Button variant="outline" disabled={resetProducts.isPending} onClick={() => confirmReset(selectedBatch.id, failedProductIds, `Set ${failedProductIds.length} failed product${failedProductIds.length === 1 ? "" : "s"} back to pending?`)}><RotateCcw className="mr-2 size-4" />Reset failed ({failedProductIds.length})</Button>}</div>}

              {productsQuery.isLoading ? <p className="text-muted-foreground py-10 text-center">Loading products…</p> : productsQuery.isError ? <p role="alert" className="text-destructive py-10 text-center">Could not load products for this batch.</p> : totalProducts === 0 ? (
                <div className="max-md:bg-card rounded-xl border border-dashed p-6 sm:p-10">
                  <div className="text-center"><div className="bg-primary/10 mx-auto mb-3 flex size-11 items-center justify-center rounded-xl"><PackagePlus className="text-primary size-5" /></div><p className="font-semibold">This batch is empty</p><p className="text-muted-foreground mt-1 text-sm">Add your first product to get started. You can always add more later.</p></div>
                  <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => openProduct()} className="hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"><Plus className="text-primary size-5" /><p className="mt-3 text-sm font-semibold">Add product</p><p className="text-muted-foreground mt-1 text-xs">Fill in a short form, one product at a time.</p></button>
                    <button type="button" onClick={openImport} className="hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-ring flex flex-col items-start justify-start rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"><FileSpreadsheet className="text-primary size-5" /><p className="mt-3 text-sm font-semibold">Import Excel</p><p className="text-muted-foreground mt-1 text-xs">Add up to 500 products at once from an .xlsx file.</p></button>
                  </div>
                  <p className="text-muted-foreground mt-4 text-center text-xs">No spreadsheet yet? <a href="/templates/product-import-template.xlsx" download className="text-primary font-medium underline-offset-4 hover:underline">Download the template</a></p>
                </div>
              ) : products.length === 0 ? (
                <div className="max-md:bg-card rounded-xl border border-dashed py-12 text-center"><p className="font-medium">No products match these filters</p><p className="text-muted-foreground mt-1 text-sm">Try another status or search term.</p><Button variant="link" size="sm" className="mt-1" onClick={() => { setSearch(""); setFilter("all"); setPage(1); }}>Clear filters</Button></div>
              ) : isPhone ? <>
                <ul id="batch-products" className="scroll-mt-3 space-y-3" aria-label="Products">
                  {visibleProducts.map((product) => (
                    <BatchProductCard
                      key={product.id}
                      product={product}
                      typeLabel={productTypeLabels[product.productType]}
                      statusLabel={statusLabel(product.status)}
                      isBusy={deleteProduct.isPending || resetProducts.isPending}
                      onEdit={product.status === "pending" ? () => openProduct(product) : undefined}
                      onDelete={product.status === "pending" ? () => confirmRemoveProduct(selectedBatch.id, product) : undefined}
                      onReset={product.status === "failed" || product.status === "image_review_required" ? () => confirmReset(selectedBatch.id, [product.id], `Set “${product.name}” back to pending?`) : undefined}
                    />
                  ))}
                </ul>
                <p className="text-muted-foreground text-center text-xs tabular-nums">Showing {(currentPage - 1) * pageSize + 1}–{(currentPage - 1) * pageSize + visibleProducts.length} of {products.length} products</p>
                <PhonePager page={currentPage} pageCount={pageCount} onPageChange={setPage} label="Product pages" anchorId="batch-products" />
              </> : <>
                <div ref={tableRef} className="overflow-hidden rounded-lg border"><Table className="table-fixed"><TableHeader className="bg-muted/50"><TableRow><TableHead className={hasKeywords ? "w-[36%]" : "w-[44%]"}>Product</TableHead><TableHead className={`hidden sm:table-cell ${hasKeywords ? "w-[18%]" : "w-[22%]"}`}>Niche</TableHead>{hasKeywords && <TableHead className="hidden w-[22%] lg:table-cell">Keywords</TableHead>}<TableHead>Status</TableHead><TableHead className="w-28"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <TableRow key={product.id} className="group/row">
                  <TableCell className="font-medium"><TruncatedTooltip value={product.name} /><span className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-normal max-sm:flex-wrap max-sm:whitespace-normal"><span className="shrink-0">{productTypeLabels[product.productType]}</span>{product.customPrompt && <><span aria-hidden>·</span><span className="sm:shrink-0">Own image prompt</span></>}{product.productDescription && <><span aria-hidden>·</span><TruncatedTooltip value={product.productDescription} className="min-w-0 truncate" /></>}</span></TableCell>
                  <TableCell className="hidden sm:table-cell"><TruncatedTooltip value={product.niche || "—"} /></TableCell>
                  {hasKeywords && <TableCell className="hidden lg:table-cell"><div className="flex min-w-0 items-center gap-1" title={product.keywords.join(", ")}>{product.keywords.slice(0, 2).map((keyword) => <span key={keyword} className="bg-muted min-w-0 truncate rounded px-1.5 py-0.5 text-xs">{keyword}</span>)}{product.keywords.length > 2 && <span className="text-muted-foreground shrink-0 px-1 py-0.5 text-xs">+{product.keywords.length - 2}</span>}</div></TableCell>}
                  <TableCell><StatusBadge status={product.status}>{statusLabel(product.status)}</StatusBadge></TableCell>
                  <TableCell className="text-right">{product.status === "pending" && <div className="flex justify-end gap-0.5 transition-opacity [@media(hover:hover)]:opacity-35 [@media(hover:hover)]:group-focus-within/row:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100"><Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)}><Pencil className="size-4"/></Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive size-8" aria-label={`Delete ${product.name}`} disabled={deleteProduct.isPending} onClick={() => confirmRemoveProduct(selectedBatch.id, product)}><Trash2 className="size-4"/></Button></div>}{(product.status === "failed" || product.status === "image_review_required") && <Button variant="outline" size="sm" className="bg-card text-foreground h-8 gap-2 rounded-full pr-1 pl-3 text-xs font-medium shadow-none" title="Set back to pending" aria-label={`Reset ${product.name} to pending`} disabled={resetProducts.isPending} onClick={() => confirmReset(selectedBatch.id, [product.id], `Set “${product.name}” back to pending?`)}>Reset<span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full"><RotateCcw className="size-3.5" /></span></Button>}</TableCell>
                </TableRow>)}</TableBody></Table></div>
                {pageCount > 1 && <nav aria-label="Product pages" className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-muted-foreground">Showing <span className="text-foreground font-medium tabular-nums">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, products.length)}</span> of <span className="text-foreground font-medium tabular-nums">{products.length}</span> products</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button variant="outline" size="icon" className="size-8" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button>
                    {pageNumbers(currentPage, pageCount).map((item, index) => item === "gap"
                      ? <span key={`gap-${index}`} className="text-muted-foreground w-8 text-center" aria-hidden>…</span>
                      : <Button key={item} variant={item === currentPage ? "default" : "ghost"} size="icon" className="size-8 tabular-nums" aria-label={`Page ${item}`} aria-current={item === currentPage ? "page" : undefined} onClick={() => goToPage(item)}>{item}</Button>)}
                    <Button variant="outline" size="icon" className="size-8" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => goToPage(currentPage + 1)}><ChevronRight className="size-4" /></Button>
                  </div>
                </nav>}
              </>}
            </div>
          </section>}
        </div>
      )}


      <BatchFormDialog open={batchDialog} onOpenChange={(open) => { setBatchDialog(open); if (!open) setEditingBatch(null); }} form={batchForm} isEditing={!!editingBatch} isCreating={createBatch.isPending} isSaving={updateBatch.isPending} onSubmit={submitBatch} />

      <Dialog open={!!deletingBatch} onOpenChange={(open) => { if (!open) setDeletingBatch(null); }}><DialogContent><DialogHeader><DialogTitle>Delete “{deletingBatch?.name}”?</DialogTitle><DialogDescription>This batch will be removed from your batch list. Its saved products and completed job history remain stored. A batch with an active queue job cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeletingBatch(null)}>Cancel</Button><Button variant="destructive" disabled={deleteBatch.isPending} onClick={() => void submitDeleteBatch()}>{deleteBatch.isPending ? "Deleting…" : "Delete batch"}</Button></DialogFooter></DialogContent></Dialog>

      <BatchProductDialog open={productDialog} onOpenChange={setProductDialog} form={productForm} isEditing={!!editing} isSaving={saveProduct.isPending} onSubmit={submitProduct} />

      <BatchImportDialog key={importSession} batchId={selectedBatch?.id} open={importDialog} onOpenChange={setImportDialog} />
    </div>
  );
};
