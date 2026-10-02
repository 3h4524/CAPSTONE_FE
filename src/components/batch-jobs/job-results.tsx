"use client";

import { useState } from "react";
import Image from "next/image";

import { MockupTemplatePickerDialog } from "@/components/batch-setup/mockup-template/mockup-template-picker-dialog";
import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { MockupGenerateDialog } from "@/components/mockups/mockup-generate-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { useGenerateAllMockups } from "@/hooks/mutations/use-generate-all-mockups";
import { useRetryFailedBatchJob } from "@/hooks/mutations/use-retry-failed-batch-job";
import { useBatchMockupSelection } from "@/hooks/queries/use-batch-mockup-selection";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { GenerateAllMockupsResult } from "@/types/mockup-templates";

const ACTIVE_STATUSES = ["queued", "running"];
const FINISHED_STATUSES = ["completed", "partially_completed", "failed"];

const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
const statusText = (status: string) => (status === "image_review_required" ? "Ready for review" : status.replaceAll("_", " "));

const Counter = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground text-xs uppercase">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

// SRS 3.4.10 Batch Job Dashboard + the view-only part of 3.5.12 Generated Image Review.
export const JobResults = ({ job }: { job: BatchJobDetail }) => {
  const retry = useRetryFailedBatchJob();
  const active = ACTIVE_STATUSES.includes(job.status);
  const canRetry = FINISHED_STATUSES.includes(job.status) && job.counters.failed > 0;
  const withImages = job.products.filter((product) => product.images.length > 0);
  const [mockupTarget, setMockupTarget] = useState<{ designImageId: string; designImageUrl: string; productName: string; productType: string } | null>(null);
  const mockupSelection = useBatchMockupSelection(job.id);
  const generateAll = useGenerateAllMockups();
  const [mockupResult, setMockupResult] = useState<GenerateAllMockupsResult | null>(null);
  const [mockupPickerOpen, setMockupPickerOpen] = useState(false);
  const selectedTemplateCount = mockupSelection.data?.templateIds.length ?? 0;
  const productNameById = new Map(job.products.map((product) => [product.productId, product.productName]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl">{job.batchName}</CardTitle>
            <StatusBadge status={job.status} className="capitalize">
              {statusText(job.status)}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {job.processedProducts} of {job.totalProducts} products processed
              </span>
              <span>{Math.round(job.progressPercentage)}%</span>
            </div>
            <Progress value={job.progressPercentage} />
            {active && <p className="text-muted-foreground text-xs">Generating images… this page refreshes automatically.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Counter label="Pending" value={job.counters.pending} />
            <Counter label="Processing" value={job.counters.processing} />
            <Counter label="Completed" value={job.counters.completed} />
            <Counter label="Failed" value={job.counters.failed} />
          </div>
          {canRetry && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
              <Button size="sm" disabled={retry.isPending} onClick={() => void retry.mutateAsync(job.id).catch(() => undefined)}>
                {retry.isPending ? "Retrying…" : `Retry failed products (${job.counters.failed})`}
              </Button>
              <p className="text-muted-foreground text-xs">Only the failed products are generated again. Each retry uses image-generation quota again.</p>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Started {formatTime(job.startedAt)} · Finished {formatTime(job.completedAt)} · {job.variationCount} per product ·{" "}
            {job.aspectRatio}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.sequence}</TableCell>
                  <TableCell className="font-medium">{product.productName}</TableCell>
                  <TableCell>{product.productType ? productTypeLabel(product.productType) : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} className="capitalize">
                      {statusText(product.status)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{product.images.length}</TableCell>
                  <TableCell className="text-destructive max-w-xs text-sm whitespace-normal">{product.errorMessage ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {withImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {withImages.map((product) => (
              <div key={product.id}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-medium">{product.productName}</h3>
                  {product.productType && <Badge variant="secondary">{productTypeLabel(product.productType)}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {/* Numbered by position: older rows were stored with duplicate variation indexes. */}
                  {product.images.map((image, position) => (
                    <div key={image.id} className="overflow-hidden rounded-lg border">
                      <a href={image.imageUrl} target="_blank" rel="noreferrer" className="group block">
                        <Image
                          src={image.imageUrl}
                          alt={`${product.productName}, variation ${position + 1}`}
                          width={image.widthPx || 512}
                          height={image.heightPx || 512}
                          unoptimized
                          className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                        />
                      </a>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <p className="text-muted-foreground text-xs">Variation {position + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setMockupTarget({ designImageId: image.id, designImageUrl: image.imageUrl, productName: product.productName, productType: product.productType })}
                        >
                          Preview on mock-up
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {withImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mock-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {active
                  ? "You can choose templates once this job finishes generating images."
                  : selectedTemplateCount === 0
                    ? "Choose the product photos to composite these designs onto."
                    : `${selectedTemplateCount} mock-up template${selectedTemplateCount === 1 ? "" : "s"} selected.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={active} onClick={() => setMockupPickerOpen(true)}>
                  {selectedTemplateCount === 0 ? "Choose templates" : "Change templates"}
                </Button>
                <Button
                  type="button"
                  disabled={selectedTemplateCount === 0 || generateAll.isPending}
                  onClick={() => generateAll.mutate(job.id, { onSuccess: setMockupResult })}
                >
                  {generateAll.isPending ? "Generating…" : "Generate mock-ups for all products"}
                </Button>
              </div>
            </div>

            {mockupResult && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Generated {mockupResult.generatedCount} new mock-up{mockupResult.generatedCount === 1 ? "" : "s"}.
                  {mockupResult.noDesignImageCount > 0 && ` ${mockupResult.noDesignImageCount} products have no image yet.`}
                  {mockupResult.noCompatibleTemplateCount > 0 &&
                    ` ${mockupResult.noCompatibleTemplateCount} products have no matching template.`}
                </p>
                {mockupResult.errors.length > 0 && (
                  <ul className="text-destructive space-y-1 text-xs">
                    {mockupResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
                {mockupResult.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {mockupResult.images.map((mockupImage) => (
                      <a
                        key={mockupImage.id}
                        href={mockupImage.mockupImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group block overflow-hidden rounded-lg border"
                      >
                        <Image
                          src={mockupImage.mockupImageUrl}
                          alt={productNameById.get(mockupImage.productId) ?? "Mock-up"}
                          width={mockupImage.mockupWidthPx}
                          height={mockupImage.mockupHeightPx}
                          unoptimized
                          className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                        />
                        <p className="text-muted-foreground truncate p-2 text-xs">
                          {productNameById.get(mockupImage.productId) ?? "Product"}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <MockupTemplatePickerDialog
        batchJobId={job.id}
        productTypeCounts={countProductTypes(job.products)}
        open={mockupPickerOpen}
        onOpenChange={setMockupPickerOpen}
      />

      <MockupGenerateDialog
        open={mockupTarget !== null}
        designImageId={mockupTarget?.designImageId ?? null}
        designImageUrl={mockupTarget?.designImageUrl ?? null}
        productName={mockupTarget?.productName ?? ""}
        productType={mockupTarget?.productType ?? ""}
        onOpenChange={(nextOpen) => !nextOpen && setMockupTarget(null)}
      />
    </div>
  );
};
