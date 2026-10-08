"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { batchJobKeys, cancelBatchJob, startBatchJob } from "@/api/batch-jobs";
import { batchKeys } from "@/api/batches";
import { applyBatchMockupTemplates, generateAllBatchMockups, getBatchMockupSelection, mockupTemplateKeys } from "@/api/mockup-templates";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import {
  ACTIVE_JOB_STATUSES,
  deriveNodeStatuses,
  DESIGNS_READY_STATUSES,
  extractMockupSelection,
  extractRunPlan,
  FINISHED_JOB_STATUSES,
  isRunBusy,
  validateRunnable,
} from "@/helpers/workflow-run";
import { prepareRun, RunBlockedError } from "@/helpers/workflow-run-prepare";
import { useBatchJob } from "@/hooks/queries/use-batch-job";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

const setRunParam = (router: ReturnType<typeof useRouter>, batchJobId: string | null) => {
  const params = new URLSearchParams(window.location.search);
  if (batchJobId) params.set("run", batchJobId);
  else params.delete("run");
  const query = params.toString();
  router.replace(query ? `/workflows?${query}` : "/workflows");
};

// Bumped by every start and every stop, so a start that is still preparing can tell it was stopped.
let activeRunToken = 0;

// Composites the selected mock-up templates onto every product's design. Safe to repeat: the
// backend reuses mock-ups that are already up to date.
// `onlyIfSelected` is for runs opened from history: a job that never had templates chosen is left
// alone instead of reporting an error nobody asked for.
export const generateRunMockups = async (batchJobId: string, options: { onlyIfSelected?: boolean } = {}) => {
  try {
    if (options.onlyIfSelected && (await getBatchMockupSelection(batchJobId)).templateIds.length === 0) return;
    if (useWorkflowRunStore.getState().batchJobId !== batchJobId) return;
    useWorkflowRunStore.getState().setMockupState("running");
    const result = await generateAllBatchMockups(batchJobId);
    if (useWorkflowRunStore.getState().batchJobId !== batchJobId) return;
    useWorkflowRunStore.getState().setMockupResult(result);
    useWorkflowRunStore.getState().setMockupState("done");
    if (result.noApprovedImageCount && result.generatedCount === 0 && result.images.length === 0) showToast("warning", "None of the designs is approved yet. Approve at least one to make mock-ups.");
    else if (result.errors.length > 0) showToast("warning", `Mock-ups finished with ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}. Open the Apply mock-up node to review them.`);
    else showToast("success", `Mock-ups ready: ${result.images.length} image${result.images.length === 1 ? "" : "s"}.`);
  } catch (error) {
    if (useWorkflowRunStore.getState().batchJobId !== batchJobId) return;
    useWorkflowRunStore.getState().setMockupState("failed");
    showToast("error", getErrorMessage(error));
  }
};

// Sends the templates and colors currently chosen on the Apply mock-up node to the job, so a change
// made after the run started is what the next mock-ups use (the job only knows what was last saved).
// Returns false, after telling the user why, when nothing was saved.
export const saveRunMockupSelection = async (batchJobId: string): Promise<boolean> => {
  const config = useWorkflowStore.getState().nodes.find((node) => node.data.type === "apply-mockup")?.data.config;
  const selection = extractMockupSelection(config ?? {});
  if (selection.templateIds.length === 0) {
    showToast("error", "Choose at least one mock-up template in the node's Settings first.");
    return false;
  }
  try {
    await applyBatchMockupTemplates(batchJobId, selection.templateIds, selection.garmentColors, selection.templateColors);
    return true;
  } catch (error) {
    showToast("error", getErrorMessage(error));
    return false;
  }
};

// Saves what the Apply mock-up node currently has chosen, then makes the mock-ups for the job (for a job that
// needs approval, from the approved designs). Used by "Continue" after reviewing and by "Apply & regenerate".
export const applySelectionAndGenerateMockups = async (batchJobId: string, queryClient: QueryClient) => {
  if (!(await saveRunMockupSelection(batchJobId))) return;
  await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.selection(batchJobId) });
  await generateRunMockups(batchJobId);
};

// Runs the open workflow against the real batch-job API: approve the batch, save the mock-up
// selection, start image generation, follow the job, then composite the mock-ups. The job on the
// server drives every node's status; the job id lives in the URL (?run=) so a reload picks it up.
export const useWorkflowRun = (activeWorkflowId: string | null, isEditorReady: boolean) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const runParam = useSearchParams().get("run");
  const batchJobId = useWorkflowRunStore((state) => state.batchJobId);
  const step = useWorkflowRunStore((state) => state.step);
  const job = useWorkflowRunStore((state) => state.job);
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const nodeSignature = useWorkflowStore((state) => state.nodes.map((node) => `${node.id}:${node.data.type}`).join("|"));
  const hasMockupNode = useWorkflowStore((state) => state.nodes.some((node) => node.data.type === "apply-mockup"));
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const setRunning = useWorkflowStore((state) => state.setRunning);
  const setNodeStatus = useWorkflowStore((state) => state.setNodeStatus);
  const resetStatuses = useWorkflowStore((state) => state.resetStatuses);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const autoMockupJobs = useRef(new Set<string>());
  const previousStatus = useRef<string | null>(null);
  const jobQuery = useBatchJob(batchJobId ?? "");

  // The URL decides which job a reloaded page follows; another workflow never inherits a run.
  useEffect(() => {
    if (!activeWorkflowId) return;
    const state = useWorkflowRunStore.getState();
    if (state.workflowId && state.workflowId !== activeWorkflowId) state.reset();
    if (runParam && useWorkflowRunStore.getState().batchJobId !== runParam) {
      useWorkflowRunStore.getState().attach(activeWorkflowId, runParam);
    }
  }, [activeWorkflowId, runParam]);

  useEffect(() => () => useWorkflowRunStore.getState().reset(), []);

  useEffect(() => {
    if (jobQuery.data) useWorkflowRunStore.getState().setJob(jobQuery.data);
  }, [jobQuery.data]);

  useEffect(() => {
    if (!jobQuery.isError || jobQuery.data) return;
    useWorkflowRunStore.getState().reset();
    setRunParam(router, null);
  }, [jobQuery.isError, jobQuery.data, router]);

  useEffect(() => {
    if (!isEditorReady) return;
    const { nodes } = useWorkflowStore.getState();
    const statuses = deriveNodeStatuses(nodes, { step, job, mockupState });
    nodes.forEach((node) => {
      if (node.data.status !== statuses[node.id]) setNodeStatus(node.id, statuses[node.id]);
    });
  }, [isEditorReady, nodeSignature, step, job, mockupState, setNodeStatus]);

  useEffect(() => {
    setRunning(isRunBusy({ step, job, mockupState }));
  }, [step, job, mockupState, setRunning]);

  // A retry puts the job back to work, so its mock-ups are made again once it finishes.
  useEffect(() => {
    if (!job || !ACTIVE_JOB_STATUSES.includes(job.status)) return;
    autoMockupJobs.current.delete(job.id);
    if (mockupState !== "idle") useWorkflowRunStore.getState().setMockupState("idle");
  }, [job, mockupState]);

  useEffect(() => {
    const status = job?.status ?? null;
    if (previousStatus.current && ACTIVE_JOB_STATUSES.includes(previousStatus.current) && status && FINISHED_JOB_STATUSES.includes(status)) {
      const needsReview = useWorkflowRunStore.getState().job?.requireApproval === true;
      if (needsReview && status !== "failed") {
        // Open the Approval gate so the designs to review are in front of the person.
        const gate = useWorkflowStore.getState().nodes.find((node) => node.data.type === "approval-gate");
        if (gate) selectNode(gate.id);
        showToast("info", "Designs are ready. Approve the ones you want, then continue to the mock-ups.");
      } else if (status === "completed") showToast("success", "Image generation finished.");
      else if (status === "partially_completed") showToast("warning", "Image generation finished, but some products failed. Open the Design image node to retry them.");
      else showToast("error", "Image generation failed.");
      // The "Previous runs" list shows each run's status, so it must not keep the old one.
      const finishedBatchId = useWorkflowRunStore.getState().job?.batchId;
      if (finishedBatchId) void queryClient.invalidateQueries({ queryKey: batchJobKeys.byBatch(finishedBatchId) });
    }
    previousStatus.current = status;
  }, [job?.status, queryClient, selectNode]);

  useEffect(() => {
    if (!isEditorReady || !hasMockupNode || !job || step !== "watching") return;
    // A job that needs approval waits: the mock-ups are asked for once the designs are reviewed.
    if (job.requireApproval === true) return;
    if (!DESIGNS_READY_STATUSES.includes(job.status) || mockupState !== "idle") return;
    if (autoMockupJobs.current.has(job.id)) return;
    autoMockupJobs.current.add(job.id);
    void generateRunMockups(job.id, { onlyIfSelected: true });
  }, [isEditorReady, hasMockupNode, job, step, mockupState]);

  const start = async () => {
    if (!activeWorkflowId) return;
    const { nodes, edges } = useWorkflowStore.getState();
    const issues = validateRunnable(nodes, edges);
    if (issues.length > 0) {
      showToast("error", issues[0].message);
      selectNode(issues[0].nodeId);
      return;
    }

    const plan = extractRunPlan(nodes);
    const run = useWorkflowRunStore.getState();
    const token = ++activeRunToken;
    const isStopped = () => token !== activeRunToken;
    run.begin(activeWorkflowId);

    try {
      const prepared = await prepareRun(plan, queryClient);
      if (isStopped()) return;
      useWorkflowRunStore.setState({ batchJobId: prepared.batchJobId });
      if (prepared.attached) {
        showToast("info", "This batch already has a running job. Showing its progress.");
      } else {
        // Saved while the job is still a draft: the backend refuses it once the job is running.
        if (plan.mockup) {
          run.setStep("saving-mockups");
          await applyBatchMockupTemplates(
            prepared.batchJobId,
            plan.mockup.templateIds,
            plan.mockup.garmentColors,
            plan.mockup.templateColors
          );
        }
        // Stopping before this point leaves a draft job that the next run reuses; after it, the job is running.
        if (isStopped()) return;
        run.setStep("starting");
        await startBatchJob({
          batchJobId: prepared.batchJobId,
          designTemplateId: plan.designTemplateId,
          styleArtPresetId: plan.styleArtPresetId,
          variationCount: plan.variationCount,
          aspectRatio: plan.aspectRatio,
          ...(plan.instructions ? { instructions: plan.instructions } : {}),
          requireApproval: plan.requireApproval,
        });
        showToast("success", "Image generation started.");
      }
      run.setStep("watching");
      setRunParam(router, prepared.batchJobId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(prepared.batchJobId) }),
        queryClient.invalidateQueries({ queryKey: batchJobKeys.byBatch(plan.batchId) }),
        queryClient.invalidateQueries({ queryKey: batchKeys.all }),
      ]);
    } catch (error) {
      if (isStopped()) return;
      useWorkflowRunStore.getState().reset();
      showToast("error", error instanceof RunBlockedError ? error.message : getErrorMessage(error));
    }
  };

  // A job that is generating is cancelled on the server and still followed until it settles. Before
  // that point there is nothing to cancel, so the run is simply abandoned.
  const cancel = async () => {
    const current = useWorkflowRunStore.getState().job;
    if (current && ACTIVE_JOB_STATUSES.includes(current.status)) {
      try {
        await cancelBatchJob(current.id);
        await queryClient.invalidateQueries({ queryKey: batchJobKeys.detail(current.id) });
        showToast("info", "Stopping after the product being generated. The remaining products are marked as cancelled.");
      } catch (error) {
        showToast("error", getErrorMessage(error));
      }
      return;
    }

    activeRunToken += 1;
    useWorkflowRunStore.getState().reset();
    resetStatuses();
    setRunning(false);
    setRunParam(router, null);
    showToast("info", "Run stopped.");
  };

  return { isRunning, start, cancel };
};
