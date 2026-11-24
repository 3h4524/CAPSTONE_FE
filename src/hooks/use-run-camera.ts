"use client";

import { useEffect, useRef } from "react";

import {
  RUN_CAMERA_EASING,
  RUN_CAMERA_FOLLOW_SMOOTHING,
  RUN_CAMERA_MAX_ZOOM,
  RUN_CAMERA_OUTRO_MS,
  RUN_CAMERA_PADDING,
  RUN_CAMERA_PUSH_IN_MS,
  RUN_FOCUS_TRANSITION_MS,
} from "@/constants/workflow-run-effects";
import {
  approachViewport,
  centerOf,
  getRunFocusIds,
  widenForPreviews,
  withLiveListing,
} from "@/helpers/workflow-run-view";
import { useListingLive } from "@/hooks/use-listing-live";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useRunFocus } from "@/hooks/use-run-focus";
import { useProcessDotsStore } from "@/stores/process-dots";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";
import { cubicBezier } from "@/utils/cubic-bezier";
import { useReactFlow, useStore } from "@xyflow/react";

const cameraEase = cubicBezier(...RUN_CAMERA_EASING);

export const useRunCamera = () => {
  const { fitBounds, fitView, getNodesBounds, getViewport, setViewport } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const dotsTravelling = useProcessDotsStore((state) => Object.keys(state.dots).length > 0);
  const effects = useRunEffects();
  const listingLive = useListingLive();
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const followPaused = useWorkflowRunViewStore((state) => state.followPaused);
  const setFollowPaused = useWorkflowRunViewStore((state) => state.setFollowPaused);
  const resetForRun = useWorkflowRunViewStore((state) => state.resetForRun);
  const { focused } = useRunFocus();
  const focusKey = useWorkflowStore((state) => getRunFocusIds(withLiveListing(state.nodes, listingLive)).join(","));
  const active = isRunning || listingLive;
  const wasActive = useRef(active);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (active) resetForRun();
  }, [active, resetForRun]);

  useEffect(() => {
    if (!effects || !active || followPaused || !focusKey || dotsTravelling) return;
    const ids = focusKey.split(",");
    const frame = (frameIds: string[], duration: number) => {
      const canvas = useWorkflowStore.getState().nodes;
      const nodes = canvas.filter((node) => frameIds.includes(node.id));
      if (nodes.length === 0) return;
      void fitBounds(widenForPreviews(getNodesBounds(nodes), nodes, canvas), {
        duration,
        padding: RUN_CAMERA_PADDING,
        ease: cameraEase,
        interpolate: "linear",
      });
    };
    const layoutDelay = wasFocused.current === focused ? 0 : RUN_FOCUS_TRANSITION_MS;
    wasFocused.current = focused;
    const timer = window.setTimeout(() => frame(ids, RUN_CAMERA_PUSH_IN_MS), layoutDelay);
    return () => window.clearTimeout(timer);
  }, [effects, active, followPaused, focusKey, focused, dotsTravelling, fitBounds, getNodesBounds]);

  useEffect(() => {
    if (!effects || !active || followPaused || !dotsTravelling) return;
    let frame = 0;
    const follow = () => {
      const focus = centerOf(Object.values(useProcessDotsStore.getState().dots));
      if (!focus) return;
      void setViewport(
        approachViewport(getViewport(), focus, { width, height }, RUN_CAMERA_MAX_ZOOM, RUN_CAMERA_FOLLOW_SMOOTHING)
      );
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [effects, active, followPaused, dotsTravelling, width, height, getViewport, setViewport]);

  useEffect(() => {
    const finished = wasActive.current && !active;
    wasActive.current = active;
    if (!finished) return;
    if (!effects || focusKey) return;
    const outro = window.setTimeout(
      () =>
        void fitView({
          duration: RUN_CAMERA_OUTRO_MS,
          padding: 0.2,
          maxZoom: 1,
          ease: cameraEase,
          interpolate: "linear",
        }),
      RUN_FOCUS_TRANSITION_MS
    );
    return () => window.clearTimeout(outro);
  }, [active, effects, focusKey, fitView]);

  const pauseFollow = () => {
    if (effects && active && !followPaused) setFollowPaused(true);
  };

  return { pauseFollow };
};
