"use client";

import { useCallback } from "react";

import {
  SIMULATION_CHUNK_SIZE,
  SIMULATION_IMAGE_COUNT,
  SIMULATION_IMAGE_HUES,
  SIMULATION_LISTING,
  SIMULATION_PRODUCT_ID,
  SIMULATION_STEP_MS,
  SIMULATION_TICK_MS,
} from "@/constants/run-simulation";
import { PROCESS_TRAVEL_MS } from "@/constants/workflow-run-effects";
import {
  chunkText,
  findCycleNodes,
  getPredecessors,
  sampleDesignImage,
  sampleMockupImage,
} from "@/helpers/run-simulation";
import { getWorkflowNodeDefinition } from "@/helpers/workflow-config";
import { useListingStreamStore } from "@/stores/listing-stream";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeType } from "@/types/workflow";
import { uuid } from "@/utils/uuid";

let simulationToken = 0;

class SimulationStopped extends Error {}

const wait = (ms: number, token: number) =>
  new Promise<void>((resolve, reject) =>
    window.setTimeout(() => (token === simulationToken ? resolve() : reject(new SimulationStopped())), ms)
  );

const LISTING_JSON = JSON.stringify({
  title: SIMULATION_LISTING.title,
  description: SIMULATION_LISTING.description,
  tags: SIMULATION_LISTING.tags.map((value) => ({ value, type: "ai" })),
});

const streamListing = async (duration: number, token: number) => {
  const listing = useListingStreamStore.getState();
  listing.start(SIMULATION_PRODUCT_ID);
  const chunks = chunkText(LISTING_JSON, SIMULATION_CHUNK_SIZE);
  const pause = Math.max(SIMULATION_TICK_MS / 4, duration / chunks.length);
  for (const chunk of chunks) {
    await wait(pause, token);
    useListingStreamStore.getState().append(SIMULATION_PRODUCT_ID, chunk);
  }
  useListingStreamStore.getState().finish(SIMULATION_PRODUCT_ID, {
    productId: SIMULATION_PRODUCT_ID,
    listingContentId: SIMULATION_PRODUCT_ID,
    title: SIMULATION_LISTING.title,
    description: SIMULATION_LISTING.description,
    tags: SIMULATION_LISTING.tags.map((value, index) => ({ value, type: "ai", position: index + 1 })),
    versionNumber: 1,
    model: "simulation",
    createdAt: null,
  });
};

const SAMPLE_IMAGES: Partial<Record<WorkflowNodeType, string[]>> = {
  "design-image": SIMULATION_IMAGE_HUES.map(sampleDesignImage),
  "apply-mockup": SIMULATION_IMAGE_HUES.map(sampleMockupImage),
};

const revealImages = (type: WorkflowNodeType, fraction: number) => {
  const images = SAMPLE_IMAGES[type];
  if (!images) return;
  const count = Math.min(SIMULATION_IMAGE_COUNT, Math.floor(fraction * (SIMULATION_IMAGE_COUNT + 1)));
  if ((useRunSimulationStore.getState().images[type]?.length ?? -1) === count) return;
  useRunSimulationStore.getState().setImages(type, images.slice(0, count));
};

const runStep = async (nodeId: string, token: number) => {
  const { nodes, setNodeRuntime } = useWorkflowStore.getState();
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return;
  const category = getWorkflowNodeDefinition(node.data.type)?.category ?? "ai";
  const duration = SIMULATION_STEP_MS[category];
  setNodeRuntime(nodeId, { status: "running", progress: 0, stage: null });
  const streaming = node.data.type === "generate-listing" ? streamListing(duration * 2, token) : null;
  const total = streaming ? duration * 2 : duration;
  for (let elapsed = 0; elapsed < total; elapsed += SIMULATION_TICK_MS) {
    await wait(SIMULATION_TICK_MS, token);
    setNodeRuntime(nodeId, { status: "running", progress: Math.min(99, Math.round((elapsed / total) * 100)) });
    revealImages(node.data.type, elapsed / total);
  }
  revealImages(node.data.type, 1);
  if (streaming) await streaming;
  setNodeRuntime(nodeId, { status: "success", progress: 100 });
};

const finish = () => {
  useWorkflowStore.getState().setRunning(false);
  useRunSimulationStore.getState().setActive(false);
  useListingStreamStore.getState().close();
};

export const useRunSimulation = () => {
  const active = useRunSimulationStore((state) => state.active);

  const start = useCallback(() => {
    const { nodes, edges, isRunning, resetStatuses, setRunning } = useWorkflowStore.getState();
    if (isRunning || nodes.length === 0) return false;
    const predecessors = getPredecessors(nodes, edges);
    if (findCycleNodes(predecessors).size > 0) return false;
    const token = ++simulationToken;
    resetStatuses();
    useRunSimulationStore.getState().clearImages();
    useListingStreamStore.getState().open(uuid());
    useRunSimulationStore.getState().setActive(true);
    setRunning(true);

    const started = new Map<string, Promise<void>>();
    const runFrom = (nodeId: string): Promise<void> => {
      const existing = started.get(nodeId);
      if (existing) return existing;
      const step = (async () => {
        const before = predecessors[nodeId];
        if (before.length > 0) {
          await Promise.all(before.map(runFrom));
          await wait(PROCESS_TRAVEL_MS, token);
        }
        await runStep(nodeId, token);
      })();
      started.set(nodeId, step);
      return step;
    };

    void Promise.all(nodes.map((node) => runFrom(node.id)))
      .then(finish)
      .catch((error: unknown) => {
        if (!(error instanceof SimulationStopped)) throw error;
      });
    return true;
  }, []);

  const stop = useCallback(() => {
    if (!useRunSimulationStore.getState().active) return;
    simulationToken++;
    finish();
    useRunSimulationStore.getState().clearImages();
    useWorkflowStore.getState().resetStatuses();
  }, []);

  return { active, start, stop };
};
