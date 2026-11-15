import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiShotOptions } from "@/components/workflows/config-panel/fields/ai-shot-options";
import { useWorkflowStore } from "@/stores/workflow";
import type { Entitlements } from "@/types/subscription";
import type { AiVideoSceneOptions, MockupAsset, VideoPackDefinition } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let entitlements: Entitlements | undefined;
let assets: MockupAsset[] = [];
let packs: VideoPackDefinition[] = [];

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
  useVideoPacks: () => ({ data: packs, isPending: false }),
}));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({
  useMockupAssets: () => ({ data: assets, isPending: false }),
}));
let previewDesign: unknown = null;
vi.mock("@/hooks/queries/use-preview-design", () => ({ usePreviewDesign: () => previewDesign }));
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

const renderWithScene = (mode: AiVideoSceneOptions["mode"], changes: Partial<AiVideoSceneOptions> = {}) => {
  const node = {
    id: "video",
    type: "workflow",
    position: { x: 0, y: 0 },
    data: {
      type: "generate-video",
      config: { mode: mode === "ai" ? "ai_shot" : "standard", aiScenes: [{ ...scene(mode), ...changes }] },
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
    assets = [];
    previewDesign = null;
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

  it("saves an AI start frame crop and clears it when another image is selected", async () => {
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    assets = [first, second].map(id => ({
      id, productId: "product", sourceType: "uploaded", role: "Hero", artworkGroupKey: "group",
      variantKey: null, revision: 1, approvalStatus: "approved", approvedRevision: 1,
      width: 1200, height: 1600, previewUrl: "/mockup.png", warnings: [],
      regions: { focalPoint: null, product: null, artwork: null, detail: null },
    }));
    renderWithScene("ai", { mockupId: first });
    await userEvent.click(screen.getByRole("button", { name: "Edit start frame" }));
    fireEvent.change(screen.getByRole("slider", { name: /Zoom/ }), { target: { value: "2" } });
    await userEvent.click(screen.getByRole("button", { name: "Save crop" }));

    const saved = () => (useWorkflowStore.getState().nodes[0]!.data.config.aiScenes as AiVideoSceneOptions[])[0]!;
    expect(saved().aiStartFrameCrop?.height).toBeCloseTo(0.5);
    expect(screen.getByText("Crop applied")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Change start frame for scene 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Use Hero 222222 for scene 1" }));
    expect(saved().mockupId).toBe(second);
    expect(saved().aiStartFrameCrop).toBeNull();
  });

  const hero = (id: string): MockupAsset => ({
    id, productId: "product", sourceType: "generated", role: "Hero", artworkGroupKey: "group",
    variantKey: "#1A1A1A", revision: 1, approvalStatus: "approved", approvedRevision: 1,
    width: 1500, height: 1500, previewUrl: "/hero.png", warnings: [], mockupTemplateId: "template",
    regions: { focalPoint: null, product: null, artwork: null, detail: null },
  });

  const renderWithFormat = (outputFormat: string, mode: AiVideoSceneOptions["mode"], changes: Partial<AiVideoSceneOptions> = {}) => {
    const node = {
      id: "video",
      type: "workflow",
      position: { x: 0, y: 0 },
      data: { type: "generate-video", config: { mode: mode === "ai" ? "ai_shot" : "standard", outputFormat, aiScenes: [{ ...scene(mode), ...changes }] } },
    } as unknown as WorkflowNode;
    useWorkflowStore.setState({ nodes: [node] });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);
  };

  it("shows the main mock-up on a Standard scene that has no start frame, and previews the motion on it", () => {
    assets = [hero("111111")];
    renderWithFormat("square", "standard");

    expect(screen.getByText("Main mock-up (automatic)")).toBeVisible();
    // The start frame thumbnail and the motion preview both show the mock-up, not the sample photo.
    expect(screen.getByAltText("Motion preview for scene 1")).toHaveAttribute("src", "/hero.png");
    expect(document.querySelector("img[src='/images/motion-preview-sample.webp']")).toBeNull();
  });

  it.each([
    ["portrait", "9 / 16"],
    ["square", "1 / 1"],
    ["landscape", "16 / 9"],
  ])("shapes the start frame thumbnail like the %s output format", (format, ratio) => {
    assets = [hero("111111")];
    renderWithFormat(format, "standard", { mockupId: "111111" });

    const thumbnail = document.querySelector("img[src='/hero.png']")!.closest("span[style*='aspect-ratio']") as HTMLElement;
    expect(thumbnail.style.aspectRatio).toBe(ratio);
  });

  const runGroupScene = (canvasMockupId: string | null, savedMockupId: string | null) => {
    assets = [
      { ...hero("black"), previewUrl: "/black.png" },
      { ...hero("gray"), variantKey: "#9EA3A8", previewUrl: "/gray.png" },
    ];
    previewDesign = { productId: "product", artworkGroupKey: "group", scoped: false, scenes: [{ sceneIndex: 0, mockupId: "gray", previewUrl: null, warning: null, overridden: false }] };
    const node = (mockupId: string | null) =>
      ({
        id: "video",
        type: "workflow",
        position: { x: 0, y: 0 },
        data: { type: "generate-video", config: { mode: "standard", outputFormat: "square", aiScenes: [{ ...scene("standard"), mockupId }] } },
      }) as unknown as WorkflowNode;
    useWorkflowStore.setState({ nodes: [node(canvasMockupId)], savedGraph: { nodes: [node(savedMockupId)], edges: [] } });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);
  };

  it("in a batch run, shows the image the server resolved for the saved scene, the one Mockup Approval marks", () => {
    runGroupScene("elsewhere", "elsewhere");

    expect(screen.getByAltText("Motion preview for scene 1")).toHaveAttribute("src", "/gray.png");
    expect(screen.queryByText(/Not saved yet/)).not.toBeInTheDocument();
  });

  it("in a batch run, says when the scene on the canvas is not the saved one the videos use", () => {
    runGroupScene(null, "elsewhere");

    expect(screen.getByText("Main mock-up (automatic)")).toBeVisible();
    expect(screen.getByAltText("Motion preview for scene 1")).toHaveAttribute("src", "/black.png");
    expect(screen.getByText(/Not saved yet/)).toBeVisible();
  });
});

describe("AiShotOptions video template of Standard scenes", () => {
  const rotatingShowcase: VideoPackDefinition = {
    code: "standard_rotate_showcase",
    version: 1,
    name: "Rotating Showcase",
    description: "Four rotating camera moves on your product images, without AI.",
    previewVideoUrl: null,
    totalDurationSeconds: 14,
    requiresCharacter: false,
    requiresSharedMockup: false,
    scenes: [
      { id: "a", mode: "standard", durationSeconds: 4, transitionIn: "cut", transitionDurationFrames: 0, standardMotionPreset: "rotate_zoom_cw" },
      { id: "b", mode: "standard", durationSeconds: 3, transitionIn: "fade", transitionDurationFrames: 10, standardMotionPreset: "rotate_ccw" },
      { id: "c", mode: "standard", durationSeconds: 3, transitionIn: "fade", transitionDurationFrames: 10, standardMotionPreset: "rotate_cw" },
      { id: "d", mode: "standard", durationSeconds: 4, transitionIn: "fade", transitionDurationFrames: 10, standardMotionPreset: "rotate_zoom_ccw" },
    ],
  };

  beforeEach(() => {
    entitlements = undefined;
    assets = [];
    previewDesign = null;
    packs = [rotatingShowcase];
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  it("fills in Standard scenes with their motion and timing, without a start frame or a shared mock-up", async () => {
    const onChange = vi.fn();
    useWorkflowStore.setState({
      nodes: [
        {
          id: "video",
          type: "workflow",
          position: { x: 0, y: 0 },
          data: { type: "generate-video", config: { mode: "standard", template: "auto", aiScenes: [] } },
        } as unknown as WorkflowNode,
      ],
    });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Video template" }));
    await userEvent.click(screen.getByRole("option", { name: /Rotating Showcase/ }));
    // The scene the panel starts with is replaced once the seller agrees.
    await userEvent.click(await screen.findByRole("button", { name: "Replace scenes" }));

    const [scenes, seconds] = onChange.mock.calls.at(-1)!;
    expect(seconds).toBe(14);
    expect((scenes as AiVideoSceneOptions[]).map((item) => [item.mode, item.durationSeconds, item.standardMotionPreset, item.transitionIn])).toEqual([
      ["standard", 4, "rotate_zoom_cw", "cut"],
      ["standard", 3, "rotate_ccw", "fade"],
      ["standard", 3, "rotate_cw", "fade"],
      ["standard", 4, "rotate_zoom_ccw", "fade"],
    ]);
    expect(scenes).toSatisfy((list: AiVideoSceneOptions[]) =>
      list.every((item) => item.startFrameMode === "direct" && item.studioFrameId === null && item.mockupId === null));
    const config = useWorkflowStore.getState().nodes[0]!.data.config;
    expect(config).toMatchObject({ mode: "standard", template: "standard_rotate_showcase", templateVersion: 1, durationSeconds: 14 });
    expect(config).not.toHaveProperty("sharedMockupId");
  });

  it("names the pack and the length it runs, until a scene is changed", () => {
    useWorkflowStore.setState({
      nodes: [
        {
          id: "video",
          type: "workflow",
          position: { x: 0, y: 0 },
          data: {
            type: "generate-video",
            config: {
              mode: "standard",
              template: "standard_rotate_showcase",
              templateVersion: 1,
              aiScenes: rotatingShowcase.scenes.map((definition) => ({
                ...scene("standard"),
                durationSeconds: definition.durationSeconds,
                standardMotionPreset: definition.standardMotionPreset,
                transitionIn: definition.transitionIn,
              })),
            },
          },
        } as unknown as WorkflowNode,
      ],
    });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);

    expect(screen.getByText("14s pack")).toBeVisible();
  });
});
