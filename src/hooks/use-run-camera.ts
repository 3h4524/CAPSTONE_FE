"use client";

import { useEffect, useRef } from "react";

import {
  RUN_CAMERA_EASING,
  RUN_CAMERA_OUTRO_MS,
  RUN_CAMERA_PADDING,
  RUN_CAMERA_PULL_BACK_MS,
  RUN_CAMERA_PUSH_IN_MS,
  RUN_FOCUS_TRANSITION_MS,
} from "@/constants/workflow-run-effects";
import { getRunFocusIds, widenForPreviews, withLiveListing } from "@/helpers/workflow-run-view";
import { useListingLive } from "@/hooks/use-listing-live";
import { useRunEffects } from "@/hooks/use-run-effects";
import { useRunFocus } from "@/hooks/use-run-focus";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunViewStore } from "@/stores/workflow-run-view";
import { cubicBezier } from "@/utils/cubic-bezier";
import { useReactFlow } from "@xyflow/react";

const cameraEase = cubicBezier(...RUN_CAMERA_EASING);

export const useRunCamera = () => {
  const { fitBounds, fitView, getNodesBounds } = useReactFlow();
  const effects = useRunEffects();
  const listingLive = useListingLive();
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const followPaused = useWorkflowRunViewStore((state) => state.followPaused);
  const setFollowPaused = useWorkflowRunViewStore((state) => state.setFollowPaused);
  const resetForRun = useWorkflowRunViewStore((state) => state.resetForRun);
  const { focused } = useRunFocus();
  const focusKey = useWorkflowStore((state) => getRunFocusIds(withLiveListing(state.nodes, listingLive)).join(","));
  const active = isRunning || listingLive;
  const previousFocus = useRef<string[]>([]);
  const wasActive = useRef(active);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (active) resetForRun();
  }, [active, resetForRun]);

  useEffect(() => {
    if (!effects || !active || followPaused || !focusKey) return;
    const ids = focusKey.split(",");
    const frame = (frameIds: string[], duration: number) => {
      const nodes = useWorkflowStore.getState().nodes.filter((node) => frameIds.includes(node.id));
      if (nodes.length === 0) return;
      void fitBounds(widenForPreviews(getNodesBounds(nodes), nodes), {
        duration,
        padding: RUN_CAMERA_PADDING,
        ease: cameraEase,
        interpolate: "linear",
      });
    };
    const leaving = previousFocus.current.filter((id) => !ids.includes(id));
    previousFocus.current = ids;
    const layoutDelay = wasFocused.current === focused ? 0 : RUN_FOCUS_TRANSITION_MS;
    wasFocused.current = focused;
    const timers: number[] = [];
    if (leaving.length === 0) {
      timers.push(window.setTimeout(() => frame(ids, RUN_CAMERA_PUSH_IN_MS), layoutDelay));
    } else {
      timers.push(window.setTimeout(() => frame([...leaving, ...ids], RUN_CAMERA_PULL_BACK_MS), layoutDelay));
      timers.push(window.setTimeout(() => frame(ids, RUN_CAMERA_PUSH_IN_MS), layoutDelay + RUN_CAMERA_PULL_BACK_MS));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [effects, active, followPaused, focusKey, focused, fitBounds, getNodesBounds]);

  useEffect(() => {
    const finished = wasActive.current && !active;
    wasActive.current = active;
    if (!finished) return;
    previousFocus.current = [];
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
