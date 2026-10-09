"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBatchJobs } from "@/hooks/queries/use-batch-jobs";
import { BATCH_JOB_PARAM } from "@/hooks/use-batch-run";
import type { BatchJobSummary } from "@/types/batch-jobs";

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
const statusText = (status: string) => status.replaceAll("_", " ");

// Each run creates a separate job with only the then-pending products, so a batch's results are spread
// across all of its jobs: they are all listed, and each opens on the workflow canvas, in the workflow it
// was started from when that is known. A draft has not started, so there is nothing to open in it; it is
// numbered all the same, so the numbers agree with "Previous runs" on the canvas.
export const BatchJobHistoryMenu = ({ batchId }: { batchId: string }) => {
  const router = useRouter();
  const { data: jobs } = useBatchJobs(batchId);

  const startedJobs = (jobs ?? [])
    .map((job, index) => ({ job, number: jobs ? jobs.length - index : 0 }))
    .filter(({ job }) => job.status.toLowerCase() !== "draft");
  if (startedJobs.length === 0) return null;

  const openOnCanvas = (job: BatchJobSummary) => {
    const query = new URLSearchParams({ [BATCH_JOB_PARAM]: job.id });
    if (job.workflowId) query.set("id", job.workflowId);
    router.push(`/workflows?${query.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 size-4" />
          Jobs ({startedJobs.length})
          <ChevronDown className="ml-2 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Jobs in this batch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {startedJobs.map(({ job, number }) => (
          <DropdownMenuItem key={job.id} onSelect={() => openOnCanvas(job)} className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">
              Job #{number} · <span className="capitalize">{statusText(job.status)}</span>
            </span>
            <span className="text-muted-foreground text-xs">
              {job.totalProducts} {job.totalProducts === 1 ? "product" : "products"} · {formatDate(job.createdAt)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
