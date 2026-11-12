"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { batchJobKeys, listBatchJobs } from "@/api/batch-jobs";
import { batchKeys, listBatchProducts } from "@/api/batches";
import { importGeneratedMockups } from "@/api/generated-mockups";
import { getRunGroup, listRunGroups, runGroupKeys } from "@/api/run-groups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { RUN_GROUP_PARAM } from "@/constants/run-group";
import { getErrorMessage } from "@/helpers/error-message";
import { confirmRunCost, takeRunAiBudget } from "@/helpers/run-cost";
import { publishConnectionIssue } from "@/helpers/shop-connections";
import { showWorkflowActionToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { hasBatchSteps, hasListingSteps, hasVideoSteps, supportsBatchVideos } from "@/helpers/workflow-run";
import { useCancelRunGroup, useStartRunGroup } from "@/hooks/mutations/use-run-group-actions";
import { ACTIVE_RUN_GROUP_STATUSES, useRunGroup } from "@/hooks/queries/use-run-group";
import { useShopConnections } from "@/hooks/queries/use-shop-connections";
import { BATCH_JOB_PARAM, NEXT_PART_PARAM, useBatchRun } from "@/hooks/use-batch-run";
import { useRunGroupSync } from "@/hooks/use-run-group-sync";
import { useVideoRunSync, useWorkflowRuntime, VIDEO_RUN_PARAM } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobSummary } from "@/types/batch-jobs";
import type { RunGroupSummary } from "@/types/video-workflow";
import { uuid } from "@/utils/uuid";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

const findNode = (type: string) => useWorkflowStore.getState().nodes.find((node) => node.data.type === type);

/** Mock-up imports sent at once: each stores up to 24 images. */
const IMPORT_CONCURRENCY = 3;

// Stores the mock-ups composited for each product as video sources, a few products at a time, so they are waiting
// at Mockup Approval. A product whose import fails can still have its mock-ups added there.
const importMockups = async (queryClient: QueryClient, productIds: string[]) => {
  let failed = 0;
  for (let index = 0; index < productIds.length; index += IMPORT_CONCURRENCY) {
    const slice = productIds.slice(index, index + IMPORT_CONCURRENCY);
    const results = await Promise.allSettled(slice.map((productId) => importGeneratedMockups(productId)));
    results.forEach((result, offset) => {
      if (result.status === "fulfilled") {
        queryClient.setQueryData(videoWorkflowKeys.assets(slice[offset]), result.value.mockups);
        failed += result.value.failedCount;
      } else failed += 1;
    });
  }
  if (failed > 0)
    showWorkflowActionToast("warning", `${failed} mock-up${failed === 1 ? "" : "s"} could not be added for the videos. Add them again at Mockup Approval.`);
};

// The products whose designs can get a video: the design job's, or every product of the batch.
const videoProducts = async (queryClient: QueryClient, batchJobId: string | null) => {
  const job = useWorkflowRunStore.getState().job;
  if (batchJobId && job?.products.length)
    return job.products.map((product) => product.productId).filter((id): id is string => Boolean(id));
  const batchId = readString(findNode("product-input")?.data.config.batchId);
  if (!batchId) return [];
  const products = await queryClient.fetchQuery({ queryKey: batchKeys.products(batchId), queryFn: () => listBatchProducts(batchId) });
  return products.map((product) => product.id);
};

const timeOf = (value: string | null | undefined) => (value ? Date.parse(value) : Number.NaN);

/**
 * The batch video run that made a design job's videos. One started from the job names it; one started after it
 * without a job (Run again once every product had its design, so no new job was made) belongs to it when it started
 * after this job and before the batch's next one. A run whose videos started comes before one still at Mockup
 * Approval (an attempt that stopped there), and the newest before older ones.
 */
export const pickJobGroup = (groups: RunGroupSummary[], jobId: string, jobs: Pick<BatchJobSummary, "id" | "createdAt">[]) => {
  const start = timeOf(jobs.find((job) => job.id === jobId)?.createdAt);
  const next = jobs
    .map((job) => timeOf(job.createdAt))
    .filter((at) => at > start)
    .sort((left, right) => left - right)[0];
  const inWindow = (at: number) => at >= start && (next === undefined || at < next);
  const newest = groups
    .filter((group) => group.batchJobId === jobId || (!group.batchJobId && inWindow(timeOf(group.createdAt))))
    .sort((left, right) => timeOf(right.createdAt) - timeOf(left.createdAt));
  return newest.find((group) => group.targetCount > 0) ?? newest[0] ?? null;
};

/**
 * The batch video run made from a design job (see `pickJobGroup`) and the run of its first video to open with it.
 * Null when the job never got to its videos, or the list cannot be read.
 */
export const findJobVideos = async (queryClient: QueryClient, workflowId: string, jobId: string, batchId = "") => {
  try {
    const groups = await queryClient.fetchQuery({
      queryKey: runGroupKeys.list(workflowId),
      queryFn: () => listRunGroups(workflowId),
      staleTime: 0,
    });
    const jobs = batchId
      ? await queryClient
          .fetchQuery({ queryKey: batchJobKeys.byBatch(batchId), queryFn: () => listBatchJobs(batchId) })
          .catch(() => [])
      : [];
    const group = pickJobGroup(groups, jobId, jobs);
    if (!group) return null;
    const detail = await queryClient.fetchQuery({ queryKey: runGroupKeys.detail(group.id), queryFn: () => getRunGroup(group.id) });
    return { groupId: group.id, runId: detail.targets.find((target) => target.runId)?.runId ?? null };
  } catch {
    return null;
  }
};

// Starts the video part for the one product chosen in Product input (AI scenes). Its composited mock-ups are stored
// as video sources first, so they are waiting at Mockup Approval when the run gets there.
const startSingleVideoRun = async (queryClient: QueryClient, startRun: () => void) => {
  const productId = readString(findNode("product-input")?.data.config.productId);
  if (!productId) {
    showWorkflowActionToast("error", "AI scenes make one product's video: choose it under Product for the video in Mockup Approval.");
    return;
  }
  await importMockups(queryClient, [productId]);
  startRun();
};

// One Run for the whole workflow, which has up to two parts with a different engine each. The design and mock-up
// steps run from here as a batch job (useBatchRun). The video steps run on the server: with Standard scenes as a
// batch video run, one video per design chosen at Mockup Approval; with AI scenes for one product
// (useWorkflowRuntime). This starts them in order, shows them on the canvas and stops whichever is working.
export const useWorkflowExecution = (activeWorkflowId: string | null, isEditorReady: boolean) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const videoIsNext = params.get(NEXT_PART_PARAM) === "video";
  const openJobId = params.get(BATCH_JOB_PARAM);
  const groupId = params.get(RUN_GROUP_PARAM);
  const batch = useBatchRun(activeWorkflowId, isEditorReady);
  const video = useWorkflowRuntime();
  const { data: group } = useRunGroup(groupId);
  const { mutateAsync: startGroup, isPending: isStartingGroup } = useStartRunGroup();
  const { mutate: cancelGroup, isPending: isCancellingGroup } = useCancelRunGroup();
  const hasBatchRun = useWorkflowRunStore((state) => state.step !== "idle" || state.job !== null);
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const batchJobId = useWorkflowRunStore((state) => state.batchJobId);
  const setRunning = useWorkflowStore((state) => state.setRunning);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const publishesToEtsy = useWorkflowStore((state) => state.nodes.some((node) => node.data.type === "publish-etsy"));
  const publishesToPrintify = useWorkflowStore((state) => state.nodes.some((node) => node.data.type === "publish-printify"));
  const connections = useShopConnections({ etsy: publishesToEtsy, printify: publishesToPrintify });
  useRunGroupSync(group?.workflowId === activeWorkflowId ? groupId : null);

  // A group waiting at Mockup Approval leaves the settings open: the scenes saved there are the ones it uses.
  // ... as does one still being made ready in the background, before its videos start by themselves.
  const groupWorking = group?.status === "running" || group?.preparing === true;
  // From the mock-ups being done to the batch video run being started (their import first): the Run goes on.
  const [isLaunchingVideo, setIsLaunchingVideo] = useState(false);
  const isRunning = batch.isBusy || video.isRunning || groupWorking || isStartingGroup || isLaunchingVideo;
  // Mockup Approval is the step at work until the videos' runs exist: the mock-ups are imported, approved and the model
  // photos made, with no node otherwise showing it.
  useVideoRunSync(hasBatchRun, group?.preparing === true || isLaunchingVideo);
  useEffect(() => {
    setRunning(isRunning);
  }, [isRunning, setRunning]);

  // An automatic Mockup Approval approves the mock-ups on the server: their cards read them again when the run moves
  // on (prepared, started, finished), not on every change, since each read signs their image links anew.
  const groupPhase = group ? `${group.id}:${group.status}:${group.preparing ? "preparing" : ""}` : null;
  useEffect(() => {
    if (groupPhase) void queryClient.invalidateQueries({ queryKey: ["mockup-assets"] });
  }, [groupPhase, queryClient]);

  // The job whose video part was started from here, so it is started once however often the page re-renders.
  const videoStartedFor = useRef<string | null>(null);
  // Set when this page started the video run, so only that run points the person to Mockup Approval.
  const announceWaiting = useRef(false);
  const startVideo = useRef(video.startRun);
  const closeVideo = useRef(video.closeRun);
  useEffect(() => {
    startVideo.current = video.startRun;
    closeVideo.current = video.closeRun;
  });

  // Opening another job stops following the video run of the one before (it goes on on the server). An earlier job
  // opened from Previous runs then gets its own videos back: the batch video run made from it, with its first video's
  // run open, so the video steps show their status, settings and videos as they were. A Run closes the old video run
  // itself before its job enters the URL and makes that job's videos later, and a reloaded page keeps both.
  const shownJobId = useRef(openJobId);
  const reopenJobVideos = useRef<(jobId: string) => Promise<void>>(async () => {});
  useEffect(() => {
    reopenJobVideos.current = async (jobId: string) => {
      const workflowId = useWorkflowStore.getState().workflowId;
      if (!workflowId) return;
      const found = await findJobVideos(queryClient, workflowId, jobId, readString(findNode("product-input")?.data.config.batchId));
      const query = new URLSearchParams(window.location.search);
      // The person may have opened another job, or started a Run, while this was read.
      if (query.get(BATCH_JOB_PARAM) !== jobId || query.has(NEXT_PART_PARAM)) return;
      if (!found) {
        if (!query.has(RUN_GROUP_PARAM)) return;
        query.delete(RUN_GROUP_PARAM);
      } else {
        query.set(RUN_GROUP_PARAM, found.groupId);
        if (found.runId) query.set(VIDEO_RUN_PARAM, found.runId);
        useWorkflowStore.getState().setVideoRunId(found.runId);
      }
      router.replace(`/workflows?${query.toString()}`, { scroll: false });
    };
  });
  useEffect(() => {
    if (openJobId === shownJobId.current) return;
    shownJobId.current = openJobId;
    if (openJobId) closeVideo.current();
  }, [openJobId]);
  // Once per job and workflow, as soon as the workflow is on the canvas: also for a page opened on a job (from the
  // Jobs menu of the Batches page, or reloaded), whose videos are not in the URL yet. A page reloaded with this job's
  // videos already in the URL keeps them; a job chosen later always replaces the videos of the one before.
  const firstJobId = useRef(openJobId);
  const reopenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!openJobId || !activeWorkflowId || !isEditorReady) return;
    const key = `${activeWorkflowId}:${openJobId}`;
    if (reopenedFor.current === key) return;
    reopenedFor.current = key;
    const query = new URLSearchParams(window.location.search);
    // A Run that just started this job makes its own videos once its mock-ups are done.
    if (query.has(NEXT_PART_PARAM)) return;
    if (openJobId === firstJobId.current && query.has(RUN_GROUP_PARAM)) return;
    void reopenJobVideos.current(openJobId);
  }, [openJobId, activeWorkflowId, isEditorReady]);

  // Starts the batch video run of a design job (or of the whole batch) and points the person to Mockup Approval.
  const startVideoGroup = useRef<(jobId: string | null) => Promise<void>>(async () => {});
  useEffect(() => {
    startVideoGroup.current = async (jobId: string | null) => {
      const { workflowId, revision } = useWorkflowStore.getState();
      if (!workflowId) return;
      setIsLaunchingVideo(true);
      try {
        await importMockups(queryClient, await videoProducts(queryClient, jobId));
        const started = await startGroup({ workflowId, revision, key: uuid(), batchJobId: jobId, aiBudgetUsd: takeRunAiBudget(workflowId) });
        useWorkflowStore.getState().setVideoRunId(null);
        const query = new URLSearchParams(window.location.search);
        query.set(RUN_GROUP_PARAM, started.id);
        query.delete(NEXT_PART_PARAM);
        query.delete(VIDEO_RUN_PARAM);
        router.replace(`/workflows?${query.toString()}`, { scroll: false });
        if (started.preparing) {
          showWorkflowActionToast("info", "Getting the videos ready. They start by themselves.");
        } else if (started.status === "waiting_for_targets") {
          const gate = findNode("approval-gate");
          if (gate) selectNode(gate.id);
          showWorkflowActionToast(
            started.notice ? "warning" : "info",
            started.notice
              ? `The videos did not start by themselves. ${started.notice}`
              : "Approve the mock-ups of each design that should get a video, then choose Continue."
          );
        } else {
          // Mockup Approval is on Approve automatically: the mock-ups are approved and the videos are on their way.
          showWorkflowActionToast(
            started.notice ? "warning" : "success",
            started.notice ?? "Mock-ups approved automatically. The videos are starting."
          );
        }
      } catch (error) {
        showWorkflowActionToast("error", `The videos could not be started. ${getErrorMessage(error)}`);
      } finally {
        setIsLaunchingVideo(false);
      }
    };
  });

  // A Run that includes the video leaves a note in the URL. Once the mock-ups of its batch job are made the
  // video part follows, also on a page that was reloaded in the meantime.
  useEffect(() => {
    if (!videoIsNext || mockupState !== "done" || !batchJobId || video.runId) return;
    if (videoStartedFor.current === batchJobId) return;
    videoStartedFor.current = batchJobId;
    if (supportsBatchVideos(useWorkflowStore.getState().nodes)) {
      void startVideoGroup.current(batchJobId);
      return;
    }
    // AI scenes: the video is made for the product chosen in Product input. When this job made nothing for it,
    // the video would show none of the mock-ups just made, so it waits for the person to choose one of the job's products.
    const videoProductId = readString(findNode("product-input")?.data.config.productId);
    const jobProducts = useWorkflowRunStore.getState().job?.products ?? [];
    if (videoProductId && jobProducts.length > 0 && !jobProducts.some((product) => product.productId === videoProductId)) {
      const query = new URLSearchParams(window.location.search);
      query.delete(NEXT_PART_PARAM);
      router.replace(`/workflows?${query.toString()}`, { scroll: false });
      const input = findNode("product-input");
      if (input) selectNode(input.id);
      showWorkflowActionToast("warning", `The video was not started: its product is not in this run. Choose ${jobProducts.length === 1 ? jobProducts[0].productName : "one of this run's products"} for the video in Product input, save, then Run again.`);
      return;
    }
    announceWaiting.current = true;
    // The note leaves the URL together with the video run entering it (see useWorkflowRuntime).
    void startSingleVideoRun(queryClient, () => startVideo.current());
  }, [videoIsNext, mockupState, batchJobId, video.runId, queryClient, router, selectNode]);

  const videoStatus = video.run?.status;
  useEffect(() => {
    if (!announceWaiting.current || videoStatus !== "waiting_for_input") return;
    announceWaiting.current = false;
    const gate = findNode("approval-gate");
    if (gate) selectNode(gate.id);
    showWorkflowActionToast("info", "Approve the mock-ups to use in the video, then continue.");
  }, [videoStatus, selectNode]);

  const start = async () => {
    const { nodes, isDirty } = useWorkflowStore.getState();
    const wantsVideo = hasVideoSteps(nodes);
    const batchVideos = wantsVideo && supportsBatchVideos(nodes);
    // Publishing comes last, after every paid step and both approvals: a shop that is not connected stops the
    // run here instead of there. The backend checks the same when the run starts.
    const unpublishable = nodes.find((node) => publishConnectionIssue(node.data.type, connections));
    if (unpublishable) {
      showWorkflowActionToast("error", publishConnectionIssue(unpublishable.data.type, connections)!.message);
      selectNode(unpublishable.id);
      return;
    }
    const listingOnly = hasListingSteps(nodes) && !hasBatchSteps(nodes) && !wantsVideo;
    if (listingOnly) {
      if (isDirty) {
        showWorkflowActionToast("warning", "Save your configuration before running.");
        return;
      }
      const input = findNode("product-input");
      if (input && !readString(input.data.config.productId)) {
        showWorkflowActionToast("error", "Choose the product for listing content in Product input.");
        selectNode(input.id);
        return;
      }
      video.closeRun();
      video.startRun();
      return;
    }
    if (wantsVideo) {
      // The video part is made from the saved workflow.
      if (isDirty) {
        showWorkflowActionToast("warning", "Save your configuration before running.");
        return;
      }
      const input = findNode("product-input");
      if (!batchVideos && input && !readString(input.data.config.productId)) {
        showWorkflowActionToast("error", "These video settings make one product's video: choose it under Product for the video in Mockup Approval.");
        selectNode(findNode("approval-gate")?.id ?? input.id);
        return;
      }
    }
    // What the Run will cost is shown first, item by item, from the saved workflow. Unsaved changes are not in it,
    // so a canvas with unsaved design settings runs without the estimate (the video part asks to save above).
    const { workflowId } = useWorkflowStore.getState();
    if (workflowId && !isDirty && !(await confirmRunCost(workflowId))) return;

    // An earlier video run is finished by now (a working one shows Stop), so its steps start clean.
    video.closeRun();

    if (hasBatchSteps(nodes) || !wantsVideo) {
      // When it starts a job, the note that the video is next goes into the URL with the job.
      const outcome = await batch.start({ videoFollows: wantsVideo });
      if (outcome !== "nothing-pending") return;
    }
    if (batchVideos) {
      await startVideoGroup.current(null);
      return;
    }
    announceWaiting.current = true;
    await startSingleVideoRun(queryClient, video.startRun);
  };

  const cancel = () => {
    if (group && ACTIVE_RUN_GROUP_STATUSES.includes(group.status) && !batch.isBusy) {
      cancelGroup({ groupId: group.id, expectedRevision: group.revision });
      return;
    }
    if (video.isRunning && !batch.isBusy) {
      video.cancelRun();
      return;
    }
    // Stopping the designs also drops the video that was to follow them.
    const query = new URLSearchParams(window.location.search);
    if (query.has(NEXT_PART_PARAM)) {
      query.delete(NEXT_PART_PARAM);
      router.replace(`/workflows?${query.toString()}`, { scroll: false });
    }
    void batch.cancel();
  };

  return { isRunning, isPending: video.isPending || isStartingGroup || isCancellingGroup, start, cancel };
};
