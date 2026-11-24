import { beforeEach, describe, expect, it, vi } from "vitest";

import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import type { AiSceneVideo, PromoVideo } from "@/types/video-workflow";
import type { WorkflowNodeData } from "@/types/workflow";
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  config: undefined as unknown,
  clips: [] as AiSceneVideo[],
  videos: [] as Partial<PromoVideo>[],
  runIds: [] as (string | null)[],
  url: "run=run-1",
  group: [] as { target: { runId: string }; video?: Partial<PromoVideo> }[],
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
vi.mock("@/hooks/queries/use-run-videos", () => ({ useRunVideos: () => ({ data: state.videos }) }));
vi.mock("@/hooks/queries/use-group-videos", () => ({
  useGroupVideos: () => ({ group: null, videos: state.group }),
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

  it("plays the whole video once it is made, its file when rendered", () => {
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
    const { container } = render(<VideoPreview data={data()} progress={40} status="success" />);
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("src", "https://videos/v1.mp4");
    expect(video).toHaveAttribute("controls");
    expect(screen.queryByText("Scene 2")).not.toBeInTheDocument();
  });

  it("draws the whole video from its scenes when it has no file yet, as Review Video does", () => {
    state.videos = [
      {
        id: "v1",
        version: 1,
        width: 1080,
        height: 1440,
        previewUrl: null,
        preview: { storyboard: {}, sources: {}, clips: {} } as PromoVideo["preview"],
      },
    ];
    render(<VideoPreview data={data()} progress={40} status="waiting_for_review" />);
    expect(screen.getByTestId("composed")).toHaveAttribute("data-video", "v1");
    expect(screen.getByTestId("composed")).toHaveAttribute("data-compact", "true");
  });

  it("keeps showing the clips while the step runs, even when a video exists", () => {
    state.videos = [{ id: "v1", version: 1, previewUrl: "https://videos/v1.mp4" }];
    render(<VideoPreview data={data()} progress={40} status="running" />);
    expect(screen.getByText("AI clips")).toBeInTheDocument();
  });

  it("in a batch run with no design open, follows the first design that has a video", () => {
    state.url = "";
    state.group = [
      { target: { runId: "design-a" } },
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
    const { container } = render(<VideoPreview data={data()} progress={40} status="success" />);
    expect(state.runIds).toContain("design-b");
    expect(container.querySelector("video")).toHaveAttribute("src", "https://videos/b.mp4");
  });
});
