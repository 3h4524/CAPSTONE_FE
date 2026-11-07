"use client";

import { useState } from "react";

import { DeleteRunDialog } from "@/components/admin/image-quality/evaluation/delete-run-dialog";
import { EmptyRuns } from "@/components/admin/image-quality/evaluation/empty-runs";
import { RunComparison } from "@/components/admin/image-quality/evaluation/run-comparison";
import { RunToolbar } from "@/components/admin/image-quality/evaluation/run-toolbar";
import { UploadRunDialog } from "@/components/admin/image-quality/evaluation/upload-run-dialog";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { useAdminImageEvalRun } from "@/hooks/queries/use-admin-image-eval-run";
import { useAdminImageEvalRuns } from "@/hooks/queries/use-admin-image-eval-runs";

export const EvaluationPanel = () => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: runs, isLoading: isLoadingRuns, isError: isRunsError } = useAdminImageEvalRuns();
  const runList = runs ?? [];
  const selectedRun = runList.find((run) => run.id === selectedRunId) ?? runList[0] ?? null;
  const { data: run, isLoading: isLoadingRun } = useAdminImageEvalRun(selectedRun?.id ?? null);

  const renderContent = () => {
    if (isRunsError) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-14 text-center">
          <p className="text-sm font-semibold text-slate-700">The evaluation runs could not be read</p>
          <p className="mt-1 text-[13px] text-slate-500">The backend that keeps them did not answer.</p>
        </div>
      );
    }
    if (isLoadingRuns || isLoadingRun) {
      return <SectionLoading label="Loading the evaluation run" />;
    }
    if (!run) {
      return <EmptyRuns onUpload={() => setIsUploadOpen(true)} />;
    }
    return <RunComparison key={run.id} run={run} />;
  };

  return (
    <div className="flex flex-col gap-5">
      <RunToolbar
        runs={runList}
        selectedRun={selectedRun}
        isLoading={isLoadingRuns}
        onSelect={setSelectedRunId}
        onUpload={() => setIsUploadOpen(true)}
        onDelete={() => setIsDeleteOpen(true)}
      />
      {renderContent()}
      <UploadRunDialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={setSelectedRunId}
      />
      <DeleteRunDialog
        open={isDeleteOpen}
        run={selectedRun}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => setSelectedRunId(null)}
      />
    </div>
  );
};
