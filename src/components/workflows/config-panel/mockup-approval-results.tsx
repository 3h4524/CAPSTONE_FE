"use client";

import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { MockupPanel } from "@/components/workflows/media/mockup-panel";
import { RunStatusPanel } from "@/components/workflows/media/run-status-panel";
import { VideoSourcesHeader } from "@/components/workflows/media/video-sources-header";
import { RunGroupPanel } from "@/components/workflows/run/run-group-panel";
import { hasVideoSteps, runsPerDesign } from "@/helpers/workflow-run";
import { useRunGroupId } from "@/hooks/queries/use-run-group";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * What Mockup Approval has to review: every design of a batch run with its mock-ups, with or without a video, or the
 * mock-ups of the one product whose video the settings make. The Results tab of the step while a run is open, and
 * part of its settings otherwise.
 */
export const MockupApprovalResults = () => {
  const groupId = useRunGroupId();
  const perDesign = useWorkflowStore((state) => runsPerDesign(state.nodes));
  const withVideo = useWorkflowStore((state) => hasVideoSteps(state.nodes));
  const title = withVideo ? "Designs that get a video" : "Designs to continue with";

  if (groupId)
    return (
      <PanelSection title={title}>
        <RunGroupPanel />
      </PanelSection>
    );
  if (perDesign || !withVideo)
    return (
      <PanelSection title={title}>
        <PanelNotice tone="info">
          When a run reaches this step, every design of its products is listed here. Approve the mock-ups of the designs
          {withVideo ? " that should get a video" : " to continue with"}, then choose Continue.
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
