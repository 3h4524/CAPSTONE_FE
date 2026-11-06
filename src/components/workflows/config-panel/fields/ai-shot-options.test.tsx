import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiShotOptions } from "@/components/workflows/config-panel/fields/ai-shot-options";
import { useWorkflowStore } from "@/stores/workflow";
import type { Entitlements } from "@/types/subscription";
import type { AiVideoSceneOptions } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let entitlements: Entitlements | undefined;

vi.mock("@/hooks/queries/use-entitlements", () => ({
  useEntitlements: () => ({ data: entitlements }),
}));
vi.mock("@/hooks/queries/use-ai-video-templates", () => ({
  useAiVideoTemplates: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/queries/use-ai-character-models", () => ({
  useAiCharacterModels: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/queries/use-video-packs", () => ({
  useVideoPacks: () => ({ data: [], isPending: false }),
}));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({
  useMockupAssets: () => ({ data: [], isPending: false }),
}));
vi.mock("@/hooks/queries/use-run-scene-videos", () => ({
  useRunSceneVideos: () => ({ data: [] }),
}));
vi.mock("@/hooks/mutations/use-review-mockup-asset", () => ({
  useReviewMockupAsset: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({
  useWorkflowRunAction: () => ({ mutateAsync: vi.fn() }),
}));
// The timeline loads music tracks on its own and has nothing to do with the plan lock.
vi.mock("@/components/workflows/media/video-timeline-editor", () => ({
  VideoTimelineEditor: () => null,
}));
vi.mock("@/hooks/use-query-client", () => ({
  useAppQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: null }) }));
vi.mock("@/hooks/use-workflow-save", () => ({
  useWorkflowSave: () => ({ saveWorkflow: vi.fn() }),
}));

const planWith = (aiVideo: boolean): Entitlements => ({
  hasPlan: true,
  planName: aiVideo ? "Pro" : "Starter",
  tier: aiVideo ? "pro" : "starter",
  isTrial: false,
  trialEndsAt: null,
  maxBatchSize: 20,
  maxConcurrentJobs: 1,
  prioritySupport: false,
  features: [
    {
      code: "ai_video",
      label: "AI video",
      kind: "flag",
      group: "Video",
      isEnabled: aiVideo,
      limitValue: null,
    },
  ],
});

const scene = (mode: AiVideoSceneOptions["mode"]): AiVideoSceneOptions => ({
  mode,
  mockupId: null,
  templateCode: "cinematic_product_showcase",
  durationSeconds: 4,
  framing: "medium",
  cameraAngle: "three_quarter",
  cameraMovement: "push_in",
  subjectMotion: "none",
  motionIntensity: "subtle",
  lighting: "soft_studio",
  extraInstructions: null,
  rightsConfirmed: false,
  startFrameMode: "direct",
  studioLayout: "none",
  studioFrameId: null,
  studioPrompt: null,
  studioReferenceHashes: [],
});

const renderWithScene = (mode: AiVideoSceneOptions["mode"]) => {
  const node = {
    id: "video",
    type: "workflow",
    position: { x: 0, y: 0 },
    data: {
      type: "generate-video",
      config: { mode: mode === "ai" ? "ai_shot" : "standard", aiScenes: [scene(mode)] },
    },
  } as unknown as WorkflowNode;
  useWorkflowStore.setState({ nodes: [node] });
  render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);
};

const openModeMenu = async () => {
  await userEvent.click(screen.getByRole("combobox", { name: "Scene 1 generation mode" }));
  return screen.getByRole("option", { name: /AI video/ });
};

describe("AiShotOptions plan lock", () => {
  beforeEach(() => {
    entitlements = undefined;
    // jsdom has no matchMedia; the Standard motion preview asks it about reduced motion.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  it("locks AI video with a Pro badge when the plan leaves it out", async () => {
    entitlements = planWith(false);
    renderWithScene("standard");

    const aiVideo = await openModeMenu();

    expect(aiVideo).toHaveAttribute("aria-disabled", "true");
    expect(within(aiVideo).getByText("Pro")).toBeInTheDocument();
  });

  it("lets a plan with AI video pick it", async () => {
    entitlements = planWith(true);
    renderWithScene("standard");

    const aiVideo = await openModeMenu();

    expect(aiVideo).not.toHaveAttribute("aria-disabled", "true");
    expect(within(aiVideo).queryByText("Pro")).not.toBeInTheDocument();
  });

  it("does not lock AI video while the plan is still loading", async () => {
    renderWithScene("standard");

    const aiVideo = await openModeMenu();

    expect(aiVideo).not.toHaveAttribute("aria-disabled", "true");
  });

  it("flags a scene saved as AI video on a plan without it, keeping the trigger to its label", () => {
    entitlements = planWith(false);
    renderWithScene("ai");

    const trigger = screen.getByRole("combobox", { name: "Scene 1 generation mode" });
    expect(trigger).toHaveTextContent(/^AI video$/);
    expect(
      screen.getByTitle("AI video is not included in your plan. Switch this scene to Standard.")
    ).toHaveTextContent("Pro");
  });

  it("shows no plan badge on an AI scene when the plan includes AI video", () => {
    entitlements = planWith(true);
    renderWithScene("ai");

    expect(screen.queryByTitle(/not included in your plan/)).not.toBeInTheDocument();
  });
});
