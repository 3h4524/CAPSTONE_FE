"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Layers3, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useForm } from "react-hook-form";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { TruncatedTooltip } from "@/components/commons/data-display/truncated-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApproveBatch } from "@/hooks/mutations/use-approve-batch";
import { useCreateBatch } from "@/hooks/mutations/use-create-batch";
import { useDeleteBatch } from "@/hooks/mutations/use-delete-batch";
import { useDeleteBatchProduct } from "@/hooks/mutations/use-delete-batch-product";
import { useImportBatchProducts } from "@/hooks/mutations/use-import-batch-products";
import { useSaveBatchProduct } from "@/hooks/mutations/use-save-batch-product";
import { useUpdateBatch } from "@/hooks/mutations/use-update-batch";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";
import { type BatchFormValues, batchSchema, type ProductFormValues, productSchema, productTypes } from "@/schemas/batches";
import type { Batch, BatchProductImportRow, Product, ProductType, SaveProductInput } from "@/types/batches";
import { zodResolver } from "@hookform/resolvers/zod";

const productTypeLabels: Record<ProductType, string> = { tshirt: "T-shirt", hoodie: "Hoodie", mug: "Mug", poster: "Poster", tote_bag: "Tote bag", phone_case: "Phone case" };
const statuses = ["pending", "queued", "processing", "completed", "failed"] as const;
const statusLabel = (status: string) => status === "pending" ? "Pending" : status === "queued" ? "Queued" : status === "failed" ? "Failed" : ["approved", "exported", "published", "completed"].includes(status) ? "Completed" : "Processing";
type ImportRow = BatchProductImportRow & { issues: string[] };

const cellText = (value: unknown) => String(value ?? "").trim();
const normalizeImportHeader = (value: unknown) => {
  const header = cellText(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["name", "productname"].includes(header)) return "name";
  if (["type", "producttype"].includes(header)) return "producttype";
  if (header === "niche") return "niche";
  if (header === "keywords") return "keywords";
  if (["description", "productdescription"].includes(header)) return "productdescription";
  if (["notes", "sourcenotes"].includes(header)) return "sourcenotes";
  return header;
};
const productTypeAliases: Record<string, ProductType> = {
  tshirt: "tshirt",
  hoodie: "hoodie",
  mug: "mug",
  poster: "poster",
  totebag: "tote_bag",
  phonecase: "phone_case",
};

export const BatchWorkspace = () => {
  const batchesQuery = useBatches();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const productsQuery = useBatchProducts(selectedBatch?.id ?? "");
  const [batchDialog, setBatchDialog] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [batchPage, setBatchPage] = useState(1);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState("");
  const [importResult, setImportResult] = useState<{ importedCount: number; errors: Array<{ row: number; name: string; message: string }> } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();
  const approveBatch = useApproveBatch();
  const saveProduct = useSaveBatchProduct();
  const importProducts = useImportBatchProducts();
  const deleteProduct = useDeleteBatchProduct();

  const batchForm = useForm<BatchFormValues>({ resolver: zodResolver(batchSchema), defaultValues: { name: "", description: "", defaultNiche: "", defaultProductType: "" } });
  const productForm = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: { name: "", productType: "tshirt", niche: "", keywords: "", productDescription: "", sourceNotes: "" } });

  const products = useMemo(() => (productsQuery.data ?? []).filter((product) => {
    const matchesSearch = `${product.name} ${product.niche ?? ""} ${product.keywords.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === "all" || statusLabel(product.status).toLowerCase() === filter);
  }), [filter, productsQuery.data, search]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const visibleProducts = products.slice((page - 1) * pageSize, page * pageSize);
  const pendingProductCount = (productsQuery.data ?? []).filter((product) => product.status === "pending").length;
  const batchPageSize = 6;
  const batchCount = batchesQuery.data?.length ?? 0;
  const batchPageCount = Math.max(1, Math.ceil(batchCount / batchPageSize));
  const currentBatchPage = Math.min(batchPage, batchPageCount);
  const visibleBatches = (batchesQuery.data ?? []).slice((currentBatchPage - 1) * batchPageSize, currentBatchPage * batchPageSize);

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
      ? { name: product.name, productType: product.productType, niche: product.niche ?? "", keywords: product.keywords.join(", "), productDescription: product.productDescription ?? "", sourceNotes: product.sourceNotes ?? "" }
      : { name: "", productType: selectedBatch?.defaultProductType as ProductType || "tshirt", niche: selectedBatch?.defaultNiche ?? "", keywords: "", productDescription: "", sourceNotes: "" });
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
      setBatchPage(1);
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
  });

  const submitProduct = productForm.handleSubmit(async (values) => {
    if (!selectedBatch) return;
    await saveProduct.mutateAsync({ batchId: selectedBatch.id, productId: editing?.id, ...toProductInput(values) });
    setProductDialog(false);
  });

  const readImportFile = async (file?: File) => {
    setFileError(""); setImportResult(null); setImportRows([]);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setFileError("Choose an Excel .xlsx file."); return; }
    if (file.size > 5 * 1024 * 1024) { setFileError("The workbook must be smaller than 5 MB."); return; }
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const sheets = await readXlsxFile(file);
      const sheetRows = (sheets.find(({ sheet }) => sheet === "Products") ?? sheets[0])?.data;
      if (!sheetRows) { setFileError("The workbook has no product worksheet."); return; }
      const headers = (sheetRows[0] ?? []).map(normalizeImportHeader);
      const requiredHeaders = ["name", "producttype", "niche", "keywords"];
      if (requiredHeaders.some((header) => !headers.includes(header))) {
        setFileError("The Products worksheet must include Product name, Product type, Niche and Keywords columns."); return;
      }
      const column = (name: string) => headers.indexOf(normalizeImportHeader(name));
      const rows: ImportRow[] = sheetRows.slice(1).map((record, index) => {
        const name = cellText(record[column("name")]);
        const productTypeText = cellText(record[column("productType")]).toLowerCase().replace(/[^a-z0-9]/g, "");
        const productType = productTypeAliases[productTypeText] ?? productTypeText as ProductType;
        const niche = cellText(record[column("niche")]);
        const keywordsText = cellText(record[column("keywords")]);
        const keywords = keywordsText.split(",").map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
        const productDescription = column("productDescription") < 0 ? "" : cellText(record[column("productDescription")]);
        const sourceNotes = column("sourceNotes") < 0 ? "" : cellText(record[column("sourceNotes")]);
        const input: SaveProductInput = { name, productType, niche, keywords, productDescription: productDescription || undefined, sourceNotes: sourceNotes || undefined };
        const parsed = productSchema.safeParse({ name, productType, niche, keywords: keywordsText, productDescription, sourceNotes });
        const issues = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
        return { row: index + 2, product: input, issues: [...new Set(issues)] };
      }).filter((row) => row.product.name || row.product.productType || row.product.niche || row.product.keywords.length || row.product.productDescription || row.product.sourceNotes);
      if (sheetRows.length - 1 > 500) { setFileError("A file can contain up to 500 product rows per import."); return; }
      if (!rows.length) { setFileError("No product rows found. Use the Products worksheet and keep the provided column headers."); return; }
      setImportRows(rows);
    } catch {
      setFileError("Could not read this workbook. Please download a fresh template and try again.");
    }
  };

  const submitImport = async () => {
    if (!selectedBatch || importRows.length === 0) return;
    const result = await importProducts.mutateAsync({ batchId: selectedBatch.id, products: importRows.map(({ row, product }) => ({ row, product })) });
    setImportResult(result);
    if (result.errors.length === 0) { setImportDialog(false); setImportRows([]); if (fileInput.current) fileInput.current.value = ""; }
    else setImportRows((current) => current.filter((row) => result.errors.some((error) => error.row === row.row)));
  };

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-muted-foreground text-sm font-medium tracking-wide">PRODUCT MANAGEMENT</p><h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">Product batches</h1><p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">Prepare and track product inputs before sending them into the creation workflow.</p></div>
        <Button onClick={openNewBatch}><Plus className="mr-2 size-4" />New batch</Button>
      </header>

      <details className="group bg-card rounded-xl border shadow-sm">
        <summary className="hover:bg-muted/50 focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium marker:hidden focus-visible:ring-2 focus-visible:outline-none">
          <span>How product batches work</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t px-4 py-4 text-sm md:grid-cols-3">
          <div><p className="font-medium">1. Add product inputs</p><p className="text-muted-foreground mt-1">Enter a product name, type, niche and keywords. Imported or manually added products stay pending.</p></div>
          <div><p className="font-medium">2. Review the batch</p><p className="text-muted-foreground mt-1">Check each product before approving. A niche describes its target market, such as hiking enthusiasts.</p></div>
          <div><p className="font-medium">3. Approve to queue</p><p className="text-muted-foreground mt-1">Approval creates a design generation job. Products lock while queued; generation starts when a queue worker is available.</p></div>
        </div>
      </details>

      {batchesQuery.isLoading ? <p className="text-muted-foreground py-12 text-center">Loading batches…</p> : batchesQuery.isError ? <Card><CardContent className="py-12 text-center" role="alert">Could not load batches. Please try again.</CardContent></Card> : (batchesQuery.data?.length ?? 0) === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center"><div className="bg-primary/10 mb-4 flex size-12 items-center justify-center rounded-xl"><FileSpreadsheet className="text-primary size-6" /></div><h2 className="text-lg font-semibold">Start with a product batch</h2><p className="text-muted-foreground mt-2 max-w-md text-sm">A batch keeps related product inputs together. You can add products manually or import them from Excel.</p><Button className="mt-5" onClick={openNewBatch}>Create your first batch</Button></CardContent></Card>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold tracking-tight">Your batches</h2><span className="bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm"><span className="text-foreground font-semibold tabular-nums">{batchCount}</span><span className="text-muted-foreground">batches</span></span></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleBatches.map((batch) => <Card key={batch.id} className={`hover:border-primary/50 h-full gap-0 overflow-hidden rounded-xl border py-0 shadow-sm transition-colors ${selectedBatch?.id === batch.id ? "border-primary bg-primary/[0.03]" : ""}`}>
              <button type="button" onClick={() => { setSelectedBatch(batch); setSearch(""); setFilter("all"); setPage(1); }} className="focus-visible:ring-ring w-full rounded-t-xl text-left focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset">
                <CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"><Layers3 className="size-4" /></span><h3 className="truncate font-semibold">{batch.name}</h3></div><StatusBadge status={batch.status} className="shrink-0 capitalize">{batch.status}</StatusBadge></div><p className="text-muted-foreground line-clamp-1 min-h-5 text-sm">{batch.description || "No description"}</p>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-sm"><span><span className="text-foreground font-medium">{batch.productCount}</span> {batch.productCount === 1 ? "product" : "products"}</span>{batch.defaultNiche && <span className="bg-muted inline-flex max-w-full items-center gap-1.5 truncate rounded-md px-2 py-1"><span className="text-muted-foreground shrink-0 text-xs">Default niche</span><span className="text-foreground truncate">{batch.defaultNiche}</span></span>}</div>
                </CardContent>
              </button>
              <div className="flex justify-end border-t px-3 py-1.5"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-muted-foreground h-8 gap-2 px-2"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => openEditBatch(batch)}><Pencil />Edit batch</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDeletingBatch(batch)}><Trash2 />Delete batch</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
            </Card>)}
          </div>
          {batchCount > batchPageSize && <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-muted-foreground">Showing {(currentBatchPage - 1) * batchPageSize + 1}–{Math.min(currentBatchPage * batchPageSize, batchCount)} of {batchCount} batches</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentBatchPage <= 1} onClick={() => setBatchPage(currentBatchPage - 1)}><ChevronLeft className="mr-1 size-4" />Previous</Button><Button variant="outline" size="sm" disabled={currentBatchPage >= batchPageCount} onClick={() => setBatchPage(currentBatchPage + 1)}>Next<ChevronRight className="ml-1 size-4" /></Button></div></div>}
        </section>
      )}

      {selectedBatch && <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-sm"><CardHeader className="bg-muted/20 border-b px-4 py-4 sm:px-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="flex items-center gap-2"><CardTitle className="text-xl">{selectedBatch.name}</CardTitle><StatusBadge status={selectedBatch.status} className="capitalize">{selectedBatch.status}</StatusBadge></div><p className="text-muted-foreground mt-1 text-sm">Review products, then approve pending items to create a design generation job.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { setImportDialog(true); setFileError(""); setImportResult(null); }}><Upload className="mr-2 size-4" />Import Excel</Button><Button variant="outline" onClick={() => openProduct()}><Plus className="mr-2 size-4" />Add product</Button>{pendingProductCount > 0 && <Button onClick={() => setApproveDialog(true)}><CheckCircle2 className="mr-2 size-4" />Approve &amp; queue ({pendingProductCount})</Button>}</div></div></CardHeader>
        <CardContent className="space-y-5 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{statuses.map((status) => { const count = (productsQuery.data ?? []).filter((product) => statusLabel(product.status).toLowerCase() === status).length; return <button key={status} type="button" onClick={() => { setFilter(filter === status ? "all" : status); setPage(1); }} className={`hover:bg-muted/50 rounded-lg border p-4 text-left transition-colors ${filter === status ? "border-primary bg-primary/[0.03]" : ""}`}><span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{statusLabel(status)}</span><span className="mt-1 block text-2xl font-semibold">{count}</span></button>; })}</div>
          <div className="flex flex-col gap-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="text-muted-foreground absolute top-2.5 left-3 size-4"/><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products, niche or keywords" className="pl-9" aria-label="Search products"/></div><Select value={filter} onValueChange={(value) => { setFilter(value ?? "all"); setPage(1); }}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
          {productsQuery.isLoading ? <p className="text-muted-foreground py-10 text-center">Loading products…</p> : productsQuery.isError ? <p role="alert" className="text-destructive py-10 text-center">Could not load products for this batch.</p> : products.length === 0 ? <div className="rounded-lg border border-dashed py-12 text-center"><p className="font-medium">{(productsQuery.data?.length ?? 0) ? "No products match these filters" : "This batch is empty"}</p><p className="text-muted-foreground mt-1 text-sm">Add one product or import a spreadsheet to get started.</p></div> : <>
            <div className="overflow-x-auto rounded-lg border"><Table className="min-w-[72rem] table-fixed"><TableHeader className="bg-muted/60"><TableRow><TableHead className="w-64">Product</TableHead><TableHead className="w-72">Description</TableHead><TableHead className="w-48">Niche</TableHead><TableHead className="w-72">Keywords</TableHead><TableHead className="w-32">Type</TableHead><TableHead className="w-32">Status</TableHead><TableHead className="w-36 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <TableRow key={product.id}><TableCell className="font-medium"><TruncatedTooltip value={product.name} /></TableCell><TableCell><TruncatedTooltip value={product.productDescription || ""} className="line-clamp-2 whitespace-normal" /></TableCell><TableCell><TruncatedTooltip value={product.niche || ""} /></TableCell><TableCell><TruncatedTooltip value={product.keywords.join(", ")} className="line-clamp-2 whitespace-normal" /></TableCell><TableCell>{productTypeLabels[product.productType]}</TableCell><TableCell><StatusBadge status={product.status}>{statusLabel(product.status)}</StatusBadge></TableCell><TableCell className="text-right">{product.status === "pending" && <div className="flex justify-end gap-1"><Button variant="outline" size="sm" onClick={() => openProduct(product)}>Edit</Button><Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} disabled={deleteProduct.isPending} onClick={() => { if (window.confirm(`Remove “${product.name}” from this batch?`)) deleteProduct.mutate({ batchId: selectedBatch.id, productId: product.id }); }}><Trash2 className="size-4"/></Button></div>}</TableCell></TableRow>)}</TableBody></Table></div>
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="text-muted-foreground">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, products.length)} of {products.length}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</Button></div></div>
          </>}
        </CardContent>
      </Card>}

      <Dialog open={approveDialog} onOpenChange={setApproveDialog}><DialogContent><DialogHeader><DialogTitle>Approve products for the queue?</DialogTitle><DialogDescription>This creates a design generation job for {pendingProductCount} pending {pendingProductCount === 1 ? "product" : "products"} in “{selectedBatch?.name}”. These products will be locked from editing while queued.</DialogDescription></DialogHeader><div className="bg-muted/40 rounded-lg border p-4 text-sm"><p className="font-medium">What happens next</p><p className="text-muted-foreground mt-1">The job and its product items are added to the queue. AI generation will start when a queue worker is available.</p></div><DialogFooter><Button variant="outline" onClick={() => setApproveDialog(false)}>Cancel</Button><Button disabled={approveBatch.isPending || pendingProductCount === 0} onClick={async () => { if (!selectedBatch) return; await approveBatch.mutateAsync(selectedBatch.id); setApproveDialog(false); }}>{approveBatch.isPending ? "Adding to queue…" : "Approve & queue"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={batchDialog} onOpenChange={(open) => { setBatchDialog(open); if (!open) setEditingBatch(null); }}><DialogContent><DialogHeader><DialogTitle>{editingBatch ? "Edit product batch" : "Create product batch"}</DialogTitle><DialogDescription>{editingBatch ? "Update the batch name and defaults used for new products." : "Set shared defaults to speed up adding products."}</DialogDescription></DialogHeader><form onSubmit={submitBatch} className="space-y-4"><div className="space-y-2"><Label htmlFor="batch-name" className="leading-5">Batch name *</Label><Input id="batch-name" {...batchForm.register("name")} placeholder="e.g. Summer outdoor collection" aria-invalid={!!batchForm.formState.errors.name}/>{batchForm.formState.errors.name && <p className="text-destructive text-sm">{batchForm.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="batch-niche" className="leading-5">Default niche</Label><Input id="batch-niche" {...batchForm.register("defaultNiche")} placeholder="e.g. hiking and camping"/><p className="text-muted-foreground text-xs">Used to prefill new products; each product can override it.</p></div><div className="space-y-2"><Label htmlFor="batch-product-type" className="leading-5">Default product type</Label><Select value={batchForm.watch("defaultProductType") || "none"} onValueChange={(value) => batchForm.setValue("defaultProductType", value === "none" ? "" : value as ProductType)}><SelectTrigger id="batch-product-type" className="w-full"><SelectValue placeholder="No default"/></SelectTrigger><SelectContent><SelectItem value="none">No default</SelectItem>{productTypes.map((type) => <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="batch-description" className="leading-5">Description</Label><Textarea id="batch-description" {...batchForm.register("description")} placeholder="What is this batch for?"/></div><DialogFooter><Button type="button" variant="outline" onClick={() => setBatchDialog(false)}>Cancel</Button><Button type="submit" disabled={createBatch.isPending || updateBatch.isPending}>{createBatch.isPending ? "Creating…" : updateBatch.isPending ? "Saving…" : editingBatch ? "Save changes" : "Create batch"}</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={!!deletingBatch} onOpenChange={(open) => { if (!open) setDeletingBatch(null); }}><DialogContent><DialogHeader><DialogTitle>Delete “{deletingBatch?.name}”?</DialogTitle><DialogDescription>This batch will be removed from your batch list. Its saved products and completed job history remain stored. A batch with an active queue job cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeletingBatch(null)}>Cancel</Button><Button variant="destructive" disabled={deleteBatch.isPending} onClick={() => void submitDeleteBatch()}>{deleteBatch.isPending ? "Deleting…" : "Delete batch"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={productDialog} onOpenChange={setProductDialog}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>These are the product inputs currently stored for the creation queue.</DialogDescription></DialogHeader><form onSubmit={submitProduct} className="space-y-5"><div className="space-y-2"><Label htmlFor="product-name" className="leading-5">Product name *</Label><Input id="product-name" {...productForm.register("name")} aria-invalid={!!productForm.formState.errors.name}/>{productForm.formState.errors.name && <p className="text-destructive text-sm">{productForm.formState.errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-type" className="leading-5">Product type *</Label><Select value={productForm.watch("productType")} onValueChange={(value) => { if (value) productForm.setValue("productType", value as ProductType, { shouldValidate: true }); }}><SelectTrigger id="product-type" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{productTypes.map((type) => <SelectItem key={type} value={type}>{productTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="product-niche" className="leading-5">Niche *</Label><Input id="product-niche" {...productForm.register("niche")} placeholder="e.g. hiking enthusiasts" aria-invalid={!!productForm.formState.errors.niche}/><p className="text-muted-foreground text-xs">The specific audience or interest this product is for.</p>{productForm.formState.errors.niche && <p className="text-destructive text-sm">{productForm.formState.errors.niche.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-keywords" className="leading-5">Keywords * <span className="text-muted-foreground font-normal">(comma separated, up to 13)</span></Label><Input id="product-keywords" {...productForm.register("keywords")} placeholder="minimalist, nature, gift" aria-invalid={!!productForm.formState.errors.keywords}/>{productForm.formState.errors.keywords && <p className="text-destructive text-sm">{productForm.formState.errors.keywords.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-description" className="leading-5">Product description <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="product-description" maxLength={2000} {...productForm.register("productDescription")} placeholder="Describe the product idea or design brief" aria-invalid={!!productForm.formState.errors.productDescription}/><p className="text-muted-foreground text-xs">Add the design idea or brief you want the generation workflow to use.</p>{productForm.formState.errors.productDescription && <p className="text-destructive text-sm">{productForm.formState.errors.productDescription.message}</p>}</div><div className="space-y-2"><Label htmlFor="product-notes" className="leading-5">Source notes <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea id="product-notes" {...productForm.register("sourceNotes")} placeholder="Reference or production notes"/>{productForm.formState.errors.sourceNotes && <p className="text-destructive text-sm">{productForm.formState.errors.sourceNotes.message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button><Button type="submit" disabled={saveProduct.isPending}>{saveProduct.isPending ? "Saving…" : editing ? "Save changes" : "Add product"}</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={importDialog} onOpenChange={(open) => { setImportDialog(open); if (!open) { setImportRows([]); setImportResult(null); setFileError(""); if (fileInput.current) fileInput.current.value = ""; } }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Import products from Excel</DialogTitle><DialogDescription>Upload a completed template. Valid rows are saved as pending products; importing does not start AI generation. Review the products and approve the batch when you are ready to queue them.</DialogDescription></DialogHeader><div className="space-y-4"><div className="bg-muted/40 flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Start with the sample template</p><p className="text-muted-foreground mt-1 text-xs">Includes a quick guide, an example and a product type dropdown.</p></div><Button variant="outline" size="sm" asChild><a href="/templates/product-import-template.xlsx" download><Download className="mr-2 size-4"/>Download template</a></Button></div><div><Label htmlFor="product-excel">Excel file (.xlsx)</Label><Input id="product-excel" ref={fileInput} type="file" accept=".xlsx" className="mt-2" onChange={(event) => void readImportFile(event.target.files?.[0])}/><p className="text-muted-foreground mt-1 text-xs">Up to 500 products and 5 MB. Required: product name, product type, niche and keywords. Niche is the target market or interest; separate 1–13 keywords with commas. Description and source notes are optional.</p></div>
          {fileError && <p role="alert" className="text-destructive text-sm">{fileError}</p>}
          {importRows.length > 0 && <div className="space-y-2 rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{importRows.length} rows ready</p><StatusBadge status={importRows.some((row) => row.issues.length) ? "pending" : "completed"}>{importRows.filter((row) => row.issues.length).length} need attention</StatusBadge></div><p className="text-muted-foreground text-sm">Rows with errors will be skipped; valid rows can still be imported.</p><div className="max-h-36 space-y-1 overflow-y-auto text-sm">{importRows.flatMap((row) => row.issues.map((issue) => <p key={`${row.row}-${issue}`} className="text-destructive">Row {row.row} · {row.product.name || "(unnamed)"}: {issue}</p>))}</div></div>}
          {importResult && <div className="rounded-lg border p-4"><p className="font-medium">Imported {importResult.importedCount} products</p>{importResult.errors.length > 0 && <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm">{importResult.errors.map((error) => <p key={`${error.row}-${error.message}`} className="text-destructive">Row {error.row} · {error.name || "(unnamed)"}: {error.message}</p>)}</div>}</div>}
        </div><DialogFooter><Button variant="outline" onClick={() => setImportDialog(false)}>Close</Button><Button onClick={() => void submitImport()} disabled={!importRows.length || importProducts.isPending}>{importProducts.isPending ? "Importing…" : "Import valid rows"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};
