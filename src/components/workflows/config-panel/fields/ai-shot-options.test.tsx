import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiShotOptions } from "@/components/workflows/config-panel/fields/ai-shot-options";
import { useWorkflowStore } from "@/stores/workflow";
import type { Entitlements } from "@/types/subscription";
import type { AiVideoSceneOptions, MockupAsset, VideoPackDefinition } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let entitlements: Entitlements | undefined;
let assets: MockupAsset[] = [];
let packs: VideoPackDefinition[] = [];
let aiTemplates: unknown[] = [];

vi.mock("@/hooks/queries/use-entitlements", () => ({
  useEntitlements: () => ({ data: entitlements }),
}));
vi.mock("@/hooks/queries/use-ai-video-templates", () => ({
  useAiVideoTemplates: () => ({ data: aiTemplates, isPending: false, isError: false, refetch: vi.fn() }),
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
let batchProducts: { id: string; name: string }[] = [];
vi.mock("@/hooks/queries/use-batch-products", () => ({
  useBatchProducts: (batchId: string) => ({ data: batchId ? batchProducts : undefined }),
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

// The scene's mode is a pair of cards below its header: Photo motion and AI video.
const aiVideoMode = () =>
  within(screen.getByRole("radiogroup", { name: "Scene 1 generation mode" })).getByRole("radio", { name: /AI video/ });

describe("AiShotOptions plan lock", () => {
  beforeEach(() => {
    entitlements = undefined;
    assets = [];
    previewDesign = null;
    useWorkflowStore.setState({ designScope: null });
    // jsdom has no matchMedia; the Standard motion preview asks it about reduced motion.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  it("locks AI video with a Pro badge when the plan leaves it out", () => {
    entitlements = planWith(false);
    renderWithScene("standard");

    const aiVideo = aiVideoMode();

    expect(aiVideo).toBeDisabled();
    expect(within(aiVideo).getByText("Pro")).toBeInTheDocument();
  });

  it("lets a plan with AI video pick it", () => {
    entitlements = planWith(true);
    renderWithScene("standard");

    const aiVideo = aiVideoMode();

    expect(aiVideo).not.toBeDisabled();
    expect(within(aiVideo).queryByText("Pro")).not.toBeInTheDocument();
  });

  it("does not lock AI video while the plan is still loading", () => {
    renderWithScene("standard");

    const aiVideo = aiVideoMode();

    expect(aiVideo).not.toBeDisabled();
  });

  it("flags a scene saved as AI video on a plan without it, and lets it switch to Photo motion", () => {
    entitlements = planWith(false);
    renderWithScene("ai");

    const modes = within(screen.getByRole("radiogroup", { name: "Scene 1 generation mode" }));
    expect(modes.getByRole("radio", { name: /AI video/ })).toHaveAttribute("aria-checked", "true");
    expect(modes.getByRole("radio", { name: /Photo motion/ })).not.toBeDisabled();
    expect(
      screen.getByTitle("AI video is not included in your plan. Switch this scene to Photo motion.")
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
    // A 9:16 frame of a 3:4 image at 2x zoom is half its height.
    renderWithFormat("portrait", "ai", { mockupId: first });
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

  const renderBatchScene = (productScope: string | null) => {
    assets = [hero("111111")];
    batchProducts = [{ id: "shirt", name: "Shirt" }, { id: "hoodie", name: "Hoodie" }];
    const video = {
      id: "video",
      type: "workflow",
      position: { x: 0, y: 0 },
      data: { type: "generate-video", config: { mode: "standard", outputFormat: "square", aiScenes: [scene("standard")] } },
    } as unknown as WorkflowNode;
    const input = {
      id: "input",
      type: "workflow",
      position: { x: 0, y: 0 },
      data: { type: "product-input", config: { batchId: "batch", productId: "" } },
    } as unknown as WorkflowNode;
    useWorkflowStore.setState({ nodes: [input, video], savedGraph: { nodes: [input, video], edges: [] }, designScope: null });
    if (productScope)
      useWorkflowStore.getState().enterDesignScope(
        { kind: "product", key: `product:${productScope}`, productId: productScope, artworkGroupKey: "", label: "Shirt", runId: null },
        video.data.config
      );
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);
  };

  it("in a batch's shared settings, hides the start frame: it belongs to one product", () => {
    renderBatchScene(null);

    expect(screen.queryByRole("region", { name: "Scene 1 start frame" })).not.toBeInTheDocument();
    expect(screen.getByText(/Choose a product in Video product/)).toBeVisible();
  });

  it("shows a batch product's start frame, its main mock-up by default, once the product is chosen", () => {
    renderBatchScene("shirt");

    expect(screen.getByRole("region", { name: "Scene 1 start frame" })).toBeVisible();
    expect(screen.getByText("Main mock-up (automatic)")).toBeVisible();
    expect(screen.queryByText(/Choose a product in Video product/)).not.toBeInTheDocument();
  });
});

describe("AiShotOptions start frame of a style with a person", () => {
  beforeEach(() => {
    entitlements = undefined;
    previewDesign = null;
    packs = [];
    useWorkflowStore.setState({ designScope: null });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => {
    aiTemplates = [];
  });

  const image = (id: string, role: string): MockupAsset => ({
    id, productId: "product", sourceType: "generated", role, artworkGroupKey: "group", variantKey: id, revision: 1,
    approvalStatus: "approved", approvedRevision: 1, width: 1500, height: 1500, previewUrl: `/${id}.png`, warnings: [],
    regions: { focalPoint: null, product: null, artwork: null, detail: null },
  });

  it("offers only lifestyle images for Product On Model", async () => {
    aiTemplates = [{
      code: "lifestyle_in_use", version: 1, name: "Product On Model", description: "On a model.", requiresLifestyle: true,
      requiresDetail: false, defaults: { ...scene("ai"), templateCode: "lifestyle_in_use" }, allowedSettings: {},
    }];
    assets = [image("hero", "Hero"), image("model", "Lifestyle")];
    renderWithScene("ai", { templateCode: "lifestyle_in_use", mockupId: "model" });

    await userEvent.click(screen.getByRole("button", { name: /start frame for scene 1/ }));
    const picker = await screen.findByRole("dialog");

    expect(within(picker).getByRole("button", { name: "Use Lifestyle model for scene 1" })).toBeVisible();
    expect(within(picker).queryByRole("button", { name: "Use Hero hero for scene 1" })).not.toBeInTheDocument();
    expect(within(picker).getByText(/starts from a lifestyle image/)).toBeVisible();
  });

  it("offers every approved image for a style without a person", async () => {
    assets = [image("hero", "Hero"), image("model", "Lifestyle")];
    renderWithScene("ai", { mockupId: "hero" });

    await userEvent.click(screen.getByRole("button", { name: /start frame for scene 1/ }));
    const picker = await screen.findByRole("dialog");

    expect(within(picker).getByRole("button", { name: "Use Hero hero for scene 1" })).toBeVisible();
    expect(within(picker).getByRole("button", { name: "Use Lifestyle model for scene 1" })).toBeVisible();
  });
});

describe("AiShotOptions retired templates", () => {
  beforeEach(() => {
    entitlements = undefined;
    assets = [];
    previewDesign = null;
    packs = [];
    useWorkflowStore.setState({ designScope: null });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  // The server no longer offers them, so a scene saved with one moves to the closest template still offered.
  it.each([
    ["creator_pov_ugc", "lifestyle_in_use"],
    ["everyday_story_moment", "lifestyle_in_use"],
    ["signature_product_reveal", "cinematic_product_showcase"],
  ])("moves a scene saved with %s to %s", (retired, current) => {
    // The saved scenes are rewritten once the product's images are known, as for any other scene fix-up.
    const input = { id: "input", type: "workflow", position: { x: 0, y: 0 },
      data: { type: "product-input", config: { productId: "product", batchId: "" } } } as unknown as WorkflowNode;
    const video = { id: "video", type: "workflow", position: { x: 0, y: 0 },
      data: { type: "generate-video", config: { mode: "ai_shot", aiScenes: [{ ...scene("ai"), templateCode: retired, subtemplateCode: "anything" }] } } } as unknown as WorkflowNode;
    useWorkflowStore.setState({ nodes: [input, video] });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);

    const [saved] = useWorkflowStore.getState().nodes[1]!.data.config.aiScenes as AiVideoSceneOptions[];
    expect(saved!.templateCode).toBe(current);
    expect(saved!.subtemplateCode).not.toBe("anything");
  });
});

describe("AiShotOptions first scene", () => {
  beforeEach(() => {
    entitlements = undefined;
    assets = [];
    previewDesign = null;
    packs = [];
    useWorkflowStore.setState({ designScope: null });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  const renderEmpty = () => {
    useWorkflowStore.setState({
      nodes: [
        { id: "video", type: "workflow", position: { x: 0, y: 0 }, data: { type: "generate-video", config: { mode: "standard", aiScenes: [] } } } as unknown as WorkflowNode,
      ],
    });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);
  };

  it("offers the first scene inside the empty state, with no Add scene button below it", async () => {
    renderEmpty();

    expect(screen.getByText("No scenes yet")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add scene" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add first scene" }));

    const scenes = useWorkflowStore.getState().nodes[0]!.data.config.aiScenes as AiVideoSceneOptions[];
    expect(scenes).toHaveLength(1);
    expect(screen.queryByText("No scenes yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add first scene" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add scene" })).toBeVisible();
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

    await userEvent.click(within(await screen.findByRole("radiogroup", { name: "Video template" })).getByRole("radio", { name: /Rotating Showcase/ }));
    // A new node has no scenes yet, so the template fills them in without asking to replace any.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

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

  it("lists each template in the panel: how many scenes, how long, and whether it costs AI credits", async () => {
    packs = [rotatingShowcase, { ...rotatingShowcase, code: "product_on_model_pack", name: "Product on Model", requiresCharacter: true,
      scenes: [{ id: "a", mode: "ai", durationSeconds: 4, templateCode: "lifestyle_in_use", subtemplateCode: "natural_motion" }] }];
    useWorkflowStore.setState({
      nodes: [{ id: "video", type: "workflow", position: { x: 0, y: 0 }, data: { type: "generate-video", config: { mode: "standard", aiScenes: [] } } } as unknown as WorkflowNode],
    });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);

    // The templates are listed in the panel itself, without a picker to open.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const templates = within(await screen.findByRole("radiogroup", { name: "Video template" }));
    expect(templates.getByRole("radio", { name: /Start from scratch/ })).toHaveAttribute("aria-checked", "true");
    const rotating = templates.getByRole("radio", { name: /Rotating Showcase/ });
    expect(within(rotating).getByText("4 scenes · 14s")).toBeVisible();
    expect(within(rotating).getByText("Photo motion · no AI cost")).toBeVisible();
    expect(within(templates.getByRole("radio", { name: /Product on Model/ })).getByText("AI video · uses AI credits")).toBeVisible();
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

    const selected = screen.getByRole("radio", { name: /Rotating Showcase/ });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(within(selected).getByText("4 scenes · 14s")).toBeVisible();
    expect(screen.queryByText(/customized/)).not.toBeInTheDocument();
  });

  it("asks in a dialog before a template replaces scenes already set up, and keeps them on No", async () => {
    packs = [rotatingShowcase];
    useWorkflowStore.setState({
      nodes: [{ id: "video", type: "workflow", position: { x: 0, y: 0 },
        data: { type: "generate-video", config: { mode: "standard", aiScenes: [{ ...scene("standard"), durationSeconds: 5 }] } } } as unknown as WorkflowNode],
    });
    render(<AiShotOptions nodeId="video" disabled={false} onChange={vi.fn()} />);

    const templates = within(await screen.findByRole("radiogroup", { name: "Video template" }));
    await userEvent.click(templates.getByRole("radio", { name: /Rotating Showcase/ }));

    const dialog = await screen.findByRole("dialog", { name: "Replace your 1 current scenes with Rotating Showcase?" });
    expect(within(dialog).getByText("4 scenes · 14s")).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep current scenes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useWorkflowStore.getState().nodes[0]!.data.config.aiScenes as AiVideoSceneOptions[]).toHaveLength(1);

    await userEvent.click(templates.getByRole("radio", { name: /Rotating Showcase/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Replace scenes" }));
    expect(useWorkflowStore.getState().nodes[0]!.data.config.aiScenes as AiVideoSceneOptions[]).toHaveLength(4);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AiShotOptions custom video prompt", () => {
  const showcase = {
    code: "cinematic_product_showcase", version: 1, name: "Cinematic Showcase", description: "A showcase.", requiresLifestyle: false,
    requiresDetail: false, defaults: scene("ai"), allowedSettings: {}, promptVersion: 5,
    basePrompt: "One continuous {{DURATION}}-second showcase of the product.",
  };
  const savedScene = () => (useWorkflowStore.getState().nodes[0]!.data.config.aiScenes as AiVideoSceneOptions[])[0]!;

  beforeEach(() => {
    entitlements = undefined;
    previewDesign = null;
    packs = [];
    assets = [];
    useWorkflowStore.setState({ designScope: null });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    aiTemplates = [showcase];
  });
  afterEach(() => {
    aiTemplates = [];
  });

  it("starts from the template's prompt and keeps only the seller's own wording", () => {
    renderWithScene("ai");

    const prompt = screen.getByRole("textbox", { name: /Video prompt for this scene/ });
    expect(prompt).toHaveValue(showcase.basePrompt);
    expect(screen.queryByRole("combobox", { name: /Scene 1 framing/ })).not.toBeInTheDocument();

    fireEvent.change(prompt, { target: { value: "A slow turn on a wooden table." } });
    expect(savedScene().customPrompt).toBe("A slow turn on a wooden table.");

    // Writing the template's own words back stores nothing, so a newer template version still applies.
    fireEvent.change(prompt, { target: { value: showcase.basePrompt } });
    expect(savedScene().customPrompt).toBeNull();
  });

  it("puts the template's prompt back on request", async () => {
    renderWithScene("ai", { customPrompt: "My own words." });

    expect(screen.getByRole("textbox", { name: /Video prompt for this scene/ })).toHaveValue("My own words.");
    await userEvent.click(screen.getByRole("button", { name: "Use the template's prompt" }));

    expect(savedScene().customPrompt).toBeNull();
  });
});
