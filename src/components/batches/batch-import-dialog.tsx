"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productLineLabels, productLineTypes, productTypeLabels } from "@/constants/batches";
import { type ImportRow, parseProductSheet } from "@/helpers/batch-import";
import { useImportBatchProducts } from "@/hooks/mutations/use-import-batch-products";
import type { BatchProductImportResult, ProductLine } from "@/types/batches";

type BatchImportDialogProps = {
  batchId?: string;
  /** The batch's line: rows of another line are pointed out before importing. */
  productLine: ProductLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Reads an Excel workbook and adds its products to a batch. Rendered with a new key each time it opens. */
export const BatchImportDialog = ({ batchId, productLine, open, onOpenChange }: BatchImportDialogProps) => {
  const importProducts = useImportBatchProducts();
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState("");
  const [importResult, setImportResult] = useState<BatchProductImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      const parsed = parseProductSheet(sheetRows, productLine);
      if ("error" in parsed) { setFileError(parsed.error); return; }
      setImportRows(parsed.rows);
    } catch {
      setFileError("Could not read this workbook. Please download a fresh template and try again.");
    }
  };

  // Rows already found wrong here are not sent: the server would only refuse them again. The result then lists every
  // row left out once, the ones skipped here and the ones the server refused, in file order.
  const validRows = importRows.filter((row) => row.issues.length === 0);
  const submitImport = async () => {
    if (!batchId || validRows.length === 0) return;
    const result = await importProducts.mutateAsync({ batchId, products: validRows.map(({ row, product }) => ({ row, product })) });
    const skipped = importRows.filter((row) => row.issues.length > 0)
      .map((row) => ({ row: row.row, name: row.product.name, message: row.issues.join(" ") }));
    const errors = [...skipped, ...result.errors].sort((left, right) => left.row - right.row);
    setImportRows([]);
    if (fileInput.current) fileInput.current.value = "";
    if (errors.length === 0) { setImportResult(null); onOpenChange(false); }
    else setImportResult({ importedCount: result.importedCount, errors });
  };

  return (
      <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) { setImportRows([]); setImportResult(null); setFileError(""); if (fileInput.current) fileInput.current.value = ""; } }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Import products from Excel</DialogTitle><DialogDescription>Upload a completed template. Valid rows are saved as pending products; importing does not start AI generation. Review the products and approve the batch when you are ready to queue them.</DialogDescription></DialogHeader><div className="space-y-4"><div className="bg-muted/40 flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Start with the sample template</p><p className="text-muted-foreground mt-1 text-xs">Includes a quick guide, an example and a product type dropdown.</p></div><Button variant="outline" size="sm" asChild><a href="/templates/product-import-template.xlsx" download><Download className="mr-2 size-4"/>Download template</a></Button></div><div><Label htmlFor="product-excel">Excel file (.xlsx)</Label><Input id="product-excel" ref={fileInput} type="file" accept=".xlsx" className="mt-2" onChange={(event) => void readImportFile(event.target.files?.[0])}/><p className="text-muted-foreground mt-1 text-xs">Up to 500 products and 5 MB. Required: product name, product type, niche and keywords. Niche is the target market or interest; separate 1–13 keywords with commas. Description and source notes are optional.{productLine && ` This is a ${productLineLabels[productLine].toLowerCase()} batch, so every product type must be ${productLineTypes[productLine].map((type) => productTypeLabels[type]).join(" or ")}.`}</p></div>
          {fileError && <p role="alert" className="text-destructive text-sm">{fileError}</p>}
          {importRows.length > 0 && <div className="space-y-2 rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{validRows.length} of {importRows.length} rows ready</p><StatusBadge status={importRows.some((row) => row.issues.length) ? "pending" : "completed"}>{importRows.filter((row) => row.issues.length).length} need attention</StatusBadge></div><p className="text-muted-foreground text-sm">Rows with errors will be skipped; valid rows can still be imported.</p><div className="max-h-36 space-y-1 overflow-y-auto text-sm">{importRows.flatMap((row) => row.issues.map((issue) => <p key={`${row.row}-${issue}`} className="text-destructive">Row {row.row} · {row.product.name || "(unnamed)"}: {issue}</p>))}</div></div>}
          {importResult && <div className="rounded-lg border p-4"><p className="font-medium">Imported {importResult.importedCount} {importResult.importedCount === 1 ? "product" : "products"}</p>{importResult.errors.length > 0 && <p className="text-muted-foreground mt-1 text-sm">{importResult.errors.length} {importResult.errors.length === 1 ? "row was" : "rows were"} not imported. Fix {importResult.errors.length === 1 ? "it" : "them"} in the file and import it again; rows already imported are refused as duplicates.</p>}{importResult.errors.length > 0 && <div className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm">{importResult.errors.map((error) => <p key={`${error.row}-${error.message}`} className="text-destructive">Row {error.row} · {error.name || "(unnamed)"}: {error.message}</p>)}</div>}</div>}
        </div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button><Button onClick={() => void submitImport()} disabled={!validRows.length || importProducts.isPending}>{importProducts.isPending ? "Importing…" : "Import valid rows"}</Button></DialogFooter></DialogContent></Dialog>
  );
};
