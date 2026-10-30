"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { importGeneratedMockups } from "@/api/generated-mockups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { getErrorMessage } from "@/helpers/error-message";
import { showWorkflowActionToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { hasBatchSteps, hasListingSteps, hasVideoSteps } from "@/helpers/workflow-run";
import { BATCH_JOB_PARAM, NEXT_PART_PARAM, useBatchRun } from "@/hooks/use-batch-run";
import { useVideoRunSync, useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

const findNode = (type: string) => useWorkflowStore.getState().nodes.find((node) => node.data.type === type);

// Starts the video part for the product chosen in Product input. Its composited mock-ups are stored as
// video sources first, so they are waiting at Mockup Approval when the run gets there.
const startVideoRun = async (queryClient: QueryClient, startRun: () => void) => {
  const productId = readString(findNode("product-input")?.data.config.productId);
  if (!productId) {
    showWorkflowActionToast("error", "Choose the product for the video in Product input.");
    return;
  }
  try {
    const result = await importGeneratedMockups(productId);
    queryClient.setQueryData(videoWorkflowKeys.assets(productId), result.mockups);
    if (result.failedCount > 0) {
      showWorkflowActionToast("warning", `${result.failedCount} mock-up${result.failedCount === 1 ? "" : "s"} could not be added for the video. Add them again at Mockup Approval.`);
    }
  } catch (error) {
    // The run still starts: it waits at Mockup Approval, where the mock-ups can be added again or uploaded.
    showWorkflowActionToast("warning", `The product's mock-ups could not be added for the video. ${getErrorMessage(error)}`);
  }
  startRun();
};

// One Run for the whole workflow, which has up to two parts with a different engine each. The design
// and mock-up steps run from here as a batch job (useBatchRun). The video steps run on the server for
// one product (useWorkflowRuntime). This starts them in order, shows both on the canvas and stops
// whichever is working.
export const useWorkflowExecution = (activeWorkflowId: string | null, isEditorReady: boolean) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const videoIsNext = params.get(NEXT_PART_PARAM) === "video";
  const openJobId = params.get(BATCH_JOB_PARAM);
  const batch = useBatchRun(activeWorkflowId, isEditorReady);
  const video = useWorkflowRuntime();
  const hasBatchRun = useWorkflowRunStore((state) => state.step !== "idle" || state.job !== null);
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const batchJobId = useWorkflowRunStore((state) => state.batchJobId);
  const setRunning = useWorkflowStore((state) => state.setRunning);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  useVideoRunSync(hasBatchRun);

  const isRunning = batch.isBusy || video.isRunning;
  useEffect(() => {
    setRunning(isRunning);
  }, [isRunning, setRunning]);

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

  // A video run is made for one product, not for a batch job, so opening another job stops following it
  // (it goes on on the server) and the video steps start clean. A Run closes the old one itself before its
  // job enters the URL, and a reloaded page keeps both.
  const shownJobId = useRef(openJobId);
  useEffect(() => {
    if (openJobId === shownJobId.current) return;
    shownJobId.current = openJobId;
    if (openJobId) closeVideo.current();
  }, [openJobId]);

  // A Run that includes the video leaves a note in the URL. Once the mock-ups of its batch job are made the
  // video part follows, also on a page that was reloaded in the meantime.
  useEffect(() => {
    if (!videoIsNext || mockupState !== "done" || !batchJobId || video.runId) return;
    if (videoStartedFor.current === batchJobId) return;
    videoStartedFor.current = batchJobId;
    // The video is made for the product chosen in Product input. When this job made nothing for it, the video
    // would show none of the mock-ups just made, so it waits for the person to choose one of the job's products.
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
    void startVideoRun(queryClient, () => startVideo.current());
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
      // The video run is made from the saved workflow, for one product.
      if (isDirty) {
        showWorkflowActionToast("warning", "Save your configuration before running.");
        return;
      }
      const input = findNode("product-input");
      if (input && !readString(input.data.config.productId)) {
        showWorkflowActionToast("error", "Choose the product for the video in Product input.");
        selectNode(input.id);
        return;
      }
    }
    // An earlier video run is finished by now (a working one shows Stop), so its steps start clean.
    video.closeRun();

    if (hasBatchSteps(nodes) || !wantsVideo) {
      // When it starts a job, the note that the video is next goes into the URL with the job.
      const outcome = await batch.start({ videoFollows: wantsVideo });
      if (outcome !== "nothing-pending") return;
    }
    announceWaiting.current = true;
    await startVideoRun(queryClient, video.startRun);
  };

  const cancel = () => {
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

  return { isRunning, isPending: video.isPending, start, cancel };
};
