"use client";

import Image from "next/image";

import { StatusBadge } from "@/components/commons/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRetryFailedBatchJob } from "@/hooks/mutations/use-retry-failed-batch-job";
import type { BatchJobDetail } from "@/types/batch-jobs";

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
                <h3 className="mb-3 font-medium">{product.productName}</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {product.images.map((image) => (
                    <a
                      key={image.id}
                      href={image.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-lg border"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={`${product.productName}, variation ${image.variationIndex + 1}`}
                        width={image.widthPx || 512}
                        height={image.heightPx || 512}
                        unoptimized
                        className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                      />
                      <p className="text-muted-foreground p-2 text-xs">Variation {image.variationIndex + 1}</p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
