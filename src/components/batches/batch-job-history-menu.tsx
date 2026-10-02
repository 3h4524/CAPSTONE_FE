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

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");
const statusText = (status: string) => status.replaceAll("_", " ");

// Each "Approve & queue" creates a separate job with only the then-pending products, so a batch's
// results are spread across all of its jobs — list them all instead of only the latest one.
export const BatchJobHistoryMenu = ({ batchId }: { batchId: string }) => {
  const router = useRouter();
  const { data: jobs } = useBatchJobs(batchId);

  if (!jobs || jobs.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 size-4" />
          Jobs ({jobs.length})
          <ChevronDown className="ml-2 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Jobs in this batch</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {jobs.map((job, index) => (
          <DropdownMenuItem key={job.id} onSelect={() => router.push(`/batch-jobs/${job.id}`)} className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">
              Job #{jobs.length - index} · <span className="capitalize">{statusText(job.status)}</span>
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
