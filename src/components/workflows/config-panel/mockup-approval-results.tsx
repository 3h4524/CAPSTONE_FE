"use client";

import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { MockupPanel } from "@/components/workflows/media/mockup-panel";
import { RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { VideoSourcesHeader } from "@/components/workflows/media/video-sources-header";
import { RunGroupPanel } from "@/components/workflows/run/run-group-panel";
import { hasVideoSteps, supportsBatchVideos } from "@/helpers/workflow-run";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * What Mockup Approval has to review: every design of a batch video run with its mock-ups, or the mock-ups of the one
 * product's video. The Results tab of the step while a run is open, and part of its settings otherwise.
 */
export const MockupApprovalResults = () => {
  const groupId = useRunGroupId();
  const batchVideos = useWorkflowStore((state) => hasVideoSteps(state.nodes) && supportsBatchVideos(state.nodes));

  if (groupId)
    return (
      <PanelSection title="Designs that get a video">
        <RunGroupPanel />
      </PanelSection>
    );
  if (batchVideos)
    return (
      <PanelSection title="Designs that get a video">
        <PanelNotice tone="info">
          When a run reaches this step, every design of its products is listed here. Approve the mock-ups of the designs
          that should get a video, then choose Continue.
        </PanelNotice>
      </PanelSection>
    );
  return (
    <PanelSection
      title="Mock-ups for the video"
      description="Approve the mock-ups to use in the video. The ones made by Apply mock-up are added here when the video part starts."
    >
      <RunStatusPanel />
      <VideoSourcesHeader />
      <MockupPanel review />
    </PanelSection>
  );
};
