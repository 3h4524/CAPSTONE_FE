"use client";

import { useMemo } from "react";

import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";
import type { RunGroupScenePreview } from "@/types/video-workflow";

export interface PreviewDesign {
  productId: string;
  artworkGroupKey: string;
  /** The image the server resolved for each scene of this design from the saved workflow. */
  scenes: RunGroupScenePreview[];
  /** The design was chosen in Generate Video, so the node shows its own settings and nothing else may override it. */
  scoped: boolean;
}

/**
 * The design the scene editor browses while a batch video run is open: the design chosen in Generate Video, else the
 * first design that has an approved mock-up, else the first one. Every design of the run is placed on the same
 * templates, so a start frame chosen on one design is carried to the others by template and color. Null outside a
 * run group.
 */
export const usePreviewDesign = (): PreviewDesign | null => {
  const { data: group } = useRunGroup(useRunGroupId());
  const scopeKey = useWorkflowStore((state) => state.designScope?.key ?? null);
  return useMemo(() => {
    const scoped = scopeKey ? group?.targets.find((candidate) => candidate.key === scopeKey) : undefined;
    const target = scoped ?? group?.targets.find((candidate) => candidate.approvedCount > 0) ?? group?.targets[0];
    return target
      ? { productId: target.productId, artworkGroupKey: target.artworkGroupKey, scenes: target.scenes, scoped: Boolean(scoped) }
      : null;
  }, [group, scopeKey]);
};
