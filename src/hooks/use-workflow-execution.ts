"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { importGeneratedMockups } from "@/api/generated-mockups";
import { videoWorkflowKeys } from "@/api/video-workflow";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { hasBatchSteps, hasVideoSteps } from "@/helpers/workflow-run";
import { NEXT_PART_PARAM, useBatchRun } from "@/hooks/use-batch-run";
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
    showToast("error", "Choose the product for the video in Product input.");
    return;
  }
  try {
    const result = await importGeneratedMockups(productId);
    queryClient.setQueryData(videoWorkflowKeys.assets(productId), result.mockups);
    if (result.failedCount > 0) {
      showToast("warning", `${result.failedCount} mock-up${result.failedCount === 1 ? "" : "s"} could not be added for the video. Add them again at Mockup Approval.`);
    }
  } catch (error) {
    // The run still starts: it waits at Mockup Approval, where the mock-ups can be added again or uploaded.
    showToast("warning", `The product's mock-ups could not be added for the video. ${getErrorMessage(error)}`);
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
  const videoIsNext = useSearchParams().get(NEXT_PART_PARAM) === "video";
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
  useEffect(() => {
    startVideo.current = video.startRun;
  });

  // A Run that includes the video leaves a note in the URL. Once the mock-ups of its batch job are made the
  // video part follows, also on a page that was reloaded in the meantime.
  useEffect(() => {
    if (!videoIsNext || mockupState !== "done" || !batchJobId || video.runId) return;
    if (videoStartedFor.current === batchJobId) return;
    videoStartedFor.current = batchJobId;
    announceWaiting.current = true;
    // The note leaves the URL together with the video run entering it (see useWorkflowRuntime).
    void startVideoRun(queryClient, () => startVideo.current());
  }, [videoIsNext, mockupState, batchJobId, video.runId, queryClient]);

  const videoStatus = video.run?.status;
  useEffect(() => {
    if (!announceWaiting.current || videoStatus !== "waiting_for_input") return;
    announceWaiting.current = false;
    const gate = findNode("approval-gate");
    if (gate) selectNode(gate.id);
    showToast("info", "Approve the mock-ups to use in the video, then continue.");
  }, [videoStatus, selectNode]);

  const start = async () => {
    const { nodes, isDirty } = useWorkflowStore.getState();
    const wantsVideo = hasVideoSteps(nodes);
    if (wantsVideo) {
      // The video run is made from the saved workflow, for one product.
      if (isDirty) {
        showToast("warning", "Save your configuration before running.");
        return;
      }
      const input = findNode("product-input");
      if (input && !readString(input.data.config.productId)) {
        showToast("error", "Choose the product for the video in Product input.");
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
