import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import type * as GroupVideos from "@/hooks/queries/use-group-videos";
import { useRunSimulationStore } from "@/stores/run-simulation";
import type { AiSceneVideo, PromoVideo } from "@/types/video-workflow";
import type { WorkflowNodeData } from "@/types/workflow";
import { fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  config: undefined as unknown,
  clips: [] as AiSceneVideo[],
  videos: [] as Partial<PromoVideo>[],
  runIds: [] as (string | null)[],
  url: "run=run-1",
  group: [] as { target: { runId: string }; video?: Partial<PromoVideo> }[],
  // The designs of a batch video run, as the canvas reads them without loading their videos.
  targets: [] as Record<string, unknown>[],
  videosByRun: {} as Record<string, Partial<PromoVideo>[]>,
  videoRunIds: [] as (string | null)[],
}));

vi.mock("@/hooks/use-video-run-id", () => ({
  useVideoRunId: () => new URLSearchParams(state.url).get("run"),
}));
// The video's progress, from merge-version-mc4: shown when there is no clip and no made video to show.
vi.mock("@/components/workflows/nodes/run-group-video-strip", () => ({
  RunGroupVideoStrip: ({ fallback }: { fallback: React.ReactNode }) => (
    <div data-testid="strip">{fallback}</div>
  ),
}));
vi.mock("@/components/workflows/nodes/preview/single-video-preview", () => ({
  SingleVideoPreview: ({ progress }: { progress: number }) => (
    <div data-testid="progress">{progress}%</div>
  ),
}));
vi.mock("@/hooks/queries/use-run-scene-videos", () => ({
  useRunSceneVideos: (runId: string | null) => {
    state.runIds.push(runId);
    return { data: state.clips };
  },
}));
vi.mock("@/hooks/queries/use-run-videos", () => ({
  useRunVideos: (runId: string | null) => {
    state.videoRunIds.push(runId);
    return { data: (runId && state.videosByRun[runId]) || state.videos };
  },
}));
vi.mock("@/hooks/queries/use-group-videos", async (importOriginal) => ({
  ...(await importOriginal<typeof GroupVideos>()),
  useGroupVideos: () => ({ group: null, videos: state.group }),
  useVideoGroupTargets: () => ({ group: null, targets: state.targets }),
}));
vi.mock("@/components/workflows/nodes/preview/scene-previews", () => ({
  ScenePreviews: ({ video }: { video: PromoVideo }) => <div data-testid="scenes" data-video={video.id} />,
}));
vi.mock("@/components/workflows/media/composed-video-preview", () => ({
  ComposedVideoPreview: ({ video, compact }: { video: PromoVideo; compact?: boolean }) => (
    <div data-testid="composed" data-video={video.id} data-compact={String(compact)} />
  ),
}));

const data = () =>
  ({ type: "generate-video", config: state.config }) as unknown as WorkflowNodeData;

// Scene 1 is photo motion; scenes 2 and 3 are made by the AI provider.
const aiConfig = {
  mode: "ai_shot",
  aiScenes: [{ mode: "standard" }, { mode: "ai" }, { mode: "ai" }],
};

describe("VideoPreview", () => {
  beforeEach(() => {
    state.config = aiConfig;
    state.clips = [];
    state.videos = [];
    state.runIds = [];
    state.url = "run=run-1";
    state.group = [];
    state.targets = [];
    state.videosByRun = {};
    state.videoRunIds = [];
  });

  it("shows a placeholder for each AI scene while its clip is being made", () => {
    const { container } = render(<VideoPreview data={data()} progress={40} status="running" />);
    expect(screen.getByText("AI clips")).toBeInTheDocument();
    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(screen.getByText("Scene 2")).toBeInTheDocument();
    expect(screen.getByText("Scene 3")).toBeInTheDocument();
    expect(screen.queryByText("Scene 1")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(2);
    expect(state.runIds).toContain("run-1");
  });

  it("plays a clip once it is stored, and marks one that failed", () => {
    state.clips = [
      { sceneOrder: 1, status: "stored", previewUrl: "https://clips/2.mp4", failure: null },
      { sceneOrder: 2, status: "failed", previewUrl: null, failure: "Provider refused the scene" },
    ];
    const { container } = render(<VideoPreview data={data()} progress={40} status="running" />);
    expect(screen.getByText("1/2")).toBeInTheDocument();
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://clips/2.mp4");
    expect(video?.muted).toBe(true);
    expect(screen.getByTitle("Provider refused the scene")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(0);
  });

  it("leaves an empty frame, not a placeholder, for a clip the stopped step did not make", () => {
    state.clips = [
      { sceneOrder: 1, status: "stored", previewUrl: "https://clips/2.mp4", failure: null },
    ];
    const { container } = render(<VideoPreview data={data()} progress={40} status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Scene 3").parentElement).toHaveClass("border-dashed");
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(0);
  });

  it("shows the video's progress once the step stopped before any clip was made", () => {
    render(<VideoPreview data={data()} progress={40} status="failed" />);
    expect(screen.getByTestId("progress")).toBeInTheDocument();
    expect(screen.queryByText("AI clips")).not.toBeInTheDocument();
  });

  it("shows the video's progress when it has no AI scene", () => {
    state.config = { mode: "standard", aiScenes: [] };
    render(<VideoPreview data={data()} progress={40} status="running" />);
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("Rendering")).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toHaveTextContent("40%");
  });

  it("plays the sample video of a preview run, and opens it in the large player", () => {
    useRunSimulationStore.setState({ video: { previewUrl: "/video-templates/sample.mp4", thumbnailUrl: null } });
    try {
      const { container } = render(<VideoPreview data={data()} progress={100} status="success" />);

      expect(container.querySelector("video")).toHaveAttribute("src", "/video-templates/sample.mp4");
      expect(screen.queryByTestId("scenes")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Expand video" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    } finally {
      useRunSimulationStore.setState({ video: null });
    }
  });

  it("shows each scene of the video once it is made, not the whole video, whether or not it has a file", () => {
    state.videos = [
      {
        id: "v1",
        version: 2,
        width: 1080,
        height: 1440,
        previewUrl: "https://videos/v1.mp4",
        thumbnailUrl: "https://img/v1.png",
      },
    ];
    const { container, unmount } = render(<VideoPreview data={data()} progress={40} status="success" />);
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByTestId("scenes")).toHaveAttribute("data-video", "v1");
    expect(container.querySelector("video")).toBeNull();
    unmount();

    state.videos = [
      {
        id: "v3",
        version: 3,
        width: 1080,
        height: 1440,
        previewUrl: null,
        preview: { storyboard: {}, sources: {}, clips: {} } as PromoVideo["preview"],
      },
    ];
    render(<VideoPreview data={data()} progress={40} status="waiting_for_review" />);
    expect(screen.getByTestId("scenes")).toHaveAttribute("data-video", "v3");
    expect(screen.queryByTestId("composed")).not.toBeInTheDocument();
  });

  it("keeps showing the clips while the step runs, even when a video exists", () => {
    state.videos = [{ id: "v1", version: 1, previewUrl: "https://videos/v1.mp4" }];
    render(<VideoPreview data={data()} progress={40} status="running" />);
    expect(screen.getByText("AI clips")).toBeInTheDocument();
  });

  it("in a batch run of one design with no design open, follows the design that has a video", () => {
    state.url = "";
    state.group = [
      {
        target: { runId: "design-b" },
        video: {
          id: "vb",
          version: 1,
          width: 1080,
          height: 1440,
          previewUrl: "https://videos/b.mp4",
        },
      },
    ];
    render(<VideoPreview data={data()} progress={40} status="success" />);
    expect(screen.getByTestId("scenes")).toHaveAttribute("data-video", "vb");
  });

  describe("with several designs", () => {
    const design = (runId: string, name: string, generate: string, progress = 0) => ({
      runId,
      productName: name,
      designLabel: "Design 1",
      previewUrl: `https://mockups/${runId}.png`,
      runStatus: generate === "succeeded" ? "waiting_for_review" : "running",
      progress,
      config: null,
      generateVideo: { status: generate, stage: null, progress, error: null },
    });

    beforeEach(() => {
      state.url = "";
      state.targets = [design("design-a", "Tee", "running", 40), design("design-b", "Hoodie", "succeeded", 100)];
      state.videosByRun = {
        "design-b": [{ id: "vb", runId: "design-b", version: 2, width: 1080, height: 1440, previewUrl: "https://videos/b.mp4" }],
      };
    });

    it("picks a design by its mock-up and shows its scenes, loading only its video", () => {
      render(<VideoPreview data={data()} progress={40} status="success" />);

      expect(screen.getByRole("button", { name: "Product 1: Tee · Design 1" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Product 2: Hoodie · Design 1" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("scenes")).toHaveAttribute("data-video", "vb");
      // The whole video is not played: its scenes are.
      expect(document.querySelector("video[src='https://videos/b.mp4']")).toBeNull();
      expect(state.videoRunIds).toContain("design-b");
      expect(state.videoRunIds).not.toContain("design-a");
    });

    it("loads another design's video only when it is picked", () => {
      render(<VideoPreview data={data()} progress={40} status="success" />);

      fireEvent.click(screen.getByRole("button", { name: "Product 1: Tee · Design 1" }));

      expect(state.videoRunIds).toContain("design-a");
      expect(screen.getByRole("button", { name: "Product 1: Tee · Design 1" })).toHaveAttribute("aria-pressed", "true");
      // Still being made: its AI scenes as the provider makes them.
      expect(screen.queryByTestId("scenes")).not.toBeInTheDocument();
      expect(screen.getByText("Scene 2")).toBeInTheDocument();
    });
  });
});
