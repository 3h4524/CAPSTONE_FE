"use client";

import { useState } from "react";

import { GeneratedImagesGrid, type MockupPreviewTarget } from "@/components/batch-jobs/generated-images-grid";
import { JobProgressCard, jobStatusText } from "@/components/batch-jobs/job-progress-card";
import { MockupResultsGrid } from "@/components/batch-jobs/mockup-results-grid";
import { MockupTemplatePickerDialog } from "@/components/batch-setup/mockup-template/mockup-template-picker-dialog";
import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { MockupGenerateDialog } from "@/components/mockups/mockup-generate-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countSelectedColors } from "@/helpers/garment-colors";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { useGenerateAllMockups } from "@/hooks/mutations/use-generate-all-mockups";
import { useBatchMockupSelection } from "@/hooks/queries/use-batch-mockup-selection";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { GenerateAllMockupsResult } from "@/types/mockup-templates";

const ACTIVE_STATUSES = ["queued", "running"];

// SRS 3.4.10 Batch Job Dashboard + the view-only part of 3.5.12 Generated Image Review.
export const JobResults = ({ job }: { job: BatchJobDetail }) => {
  const active = ACTIVE_STATUSES.includes(job.status);
  const hasImages = job.products.some((product) => product.images.length > 0);
  const [mockupTarget, setMockupTarget] = useState<MockupPreviewTarget | null>(null);
  const mockupSelection = useBatchMockupSelection(job.id);
  const generateAll = useGenerateAllMockups();
  const [mockupResult, setMockupResult] = useState<GenerateAllMockupsResult | null>(null);
  const [mockupPickerOpen, setMockupPickerOpen] = useState(false);
  const selectedTemplateCount = mockupSelection.data?.templateIds.length ?? 0;
  const selectedColorCount = countSelectedColors(mockupSelection.data);
  const sampleDesignUrl = job.products.find((product) => product.images.length > 0)?.images[0]?.imageUrl;
  const productNameById = new Map(job.products.map((product) => [product.productId, product.productName]));

  return (
    <div className="space-y-6">
      <JobProgressCard job={job} />

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
                      {jobStatusText(product.status)}
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

      {hasImages && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated images</CardTitle>
          </CardHeader>
          <CardContent>
            <GeneratedImagesGrid products={job.products} onPreview={setMockupTarget} />
          </CardContent>
        </Card>
      )}

      {hasImages && (
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
                    : `${selectedTemplateCount} mock-up template${selectedTemplateCount === 1 ? "" : "s"}${
                        selectedColorCount > 0 ? ` and ${selectedColorCount} garment color${selectedColorCount === 1 ? "" : "s"}` : ""
                      } selected.`}
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

            {mockupResult && <MockupResultsGrid result={mockupResult} productNameById={productNameById} />}
          </CardContent>
        </Card>
      )}

      <MockupTemplatePickerDialog
        batchJobId={job.id}
        productTypeCounts={countProductTypes(job.products)}
        sampleDesignUrl={sampleDesignUrl}
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
