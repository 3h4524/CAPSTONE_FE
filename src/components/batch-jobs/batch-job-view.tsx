"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GenerationSetup } from "@/components/batch-jobs/generation-setup";
import { JobResults } from "@/components/batch-jobs/job-results";
import { Button } from "@/components/ui/button";
import { useBatchJob } from "@/hooks/queries/use-batch-job";

export const BatchJobView = ({ batchJobId }: { batchJobId: string }) => {
  const jobQuery = useBatchJob(batchJobId);
  const job = jobQuery.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/batches">
          <ArrowLeft className="mr-2 size-4" />
          Back to batches
        </Link>
      </Button>
      {jobQuery.isLoading && <p className="text-muted-foreground py-16 text-center">Loading job…</p>}
      {jobQuery.isError && !job && (
        <p role="alert" className="text-destructive py-16 text-center">
          Could not load this job.
        </p>
      )}
      {job && (job.status === "draft" ? <GenerationSetup job={job} /> : <JobResults job={job} />)}
    </div>
  );
};
