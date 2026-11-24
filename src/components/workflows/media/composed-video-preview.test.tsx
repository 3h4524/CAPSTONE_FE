import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComposedVideoPreview } from "@/components/workflows/media/composed-video-preview";
import type { SoundtrackPreview } from "@/hooks/use-soundtrack-preview";
import type { PromoVideo, VideoPreviewData } from "@/types/video-workflow";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const { soundtrack, player } = vi.hoisted(() => ({
  soundtrack: vi.fn<() => SoundtrackPreview>(),
  player: vi.fn(),
}));

vi.mock("@/hooks/use-soundtrack-preview", () => ({ useSoundtrackPreview: soundtrack }));
vi.mock("@/api/video-workflow", () => ({ videoWorkflowKeys: { videos: (runId: string) => ["videos", runId] } }));
// The player draws frames with Remotion; here only what it is given matters.
vi.mock("@remotion/player", () => ({
  Player: (props: Record<string, unknown>) => {
    player(props);
    return <div data-testid="player" />;
  },
}));

const scene = (sceneOrder: number, generationStrategy: string, durationFrames = 90) => ({
  mockupId: `mockup-${sceneOrder}`, sourceRevision: 1, sourceHash: "hash", role: "Hero", sceneOrder, durationFrames,
  crop: { x: 0, y: 0, width: 1, height: 1 }, endCrop: { x: 0, y: 0, width: 1, height: 1 }, motion: "static" as const,
  transition: "none" as const, text: "", generationStrategy, warnings: [],
});

const preview = (overrides: Partial<VideoPreviewData> = {}, scenes = [scene(0, "standard"), scene(1, "ai_shot")]): VideoPreviewData => ({
  storyboard: { template: "product_showcase", templateVersion: 2, durationSeconds: 6, outputDurationFrames: 180, productType: "tshirt",
    scenes, fingerprint: "fingerprint-1", outputFormat: "portrait", width: 1080, height: 1920, aspectRatio: "9:16", transitionOverlapFrames: 0 },
  sources: { "mockup-0": { url: "https://signed/0.png", width: 2048, height: 2048 }, "mockup-1": { url: "https://signed/1.png", width: 2048, height: 2048 } },
  clips: { "1": "https://signed/clip.mp4" },
  ...overrides,
});

const video = (data: VideoPreviewData | null | undefined, status = "ready"): PromoVideo => ({
  id: "video-1", runId: "run-1", mode: "ai_shot", template: "product_showcase", version: 1, reviewRevision: 1, status,
  approvalStatus: "pending", previewUrl: null, thumbnailUrl: null, qa: {}, scenes: [], outputFormat: "portrait",
  width: 1080, height: 1920, aspectRatio: "9:16", preview: data,
});

const renderPreview = (value: PromoVideo) =>
  render(<QueryClientProvider client={new QueryClient()}><ComposedVideoPreview video={value} /></QueryClientProvider>);

describe("ComposedVideoPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    soundtrack.mockReturnValue({ status: "none" });
  });

  it("plays the whole video from its scenes, with the AI clip joined to the photo scenes", () => {
    renderPreview(video(preview()));

    expect(screen.getByTestId("player")).toBeInTheDocument();
    const props = player.mock.calls[0]![0] as { durationInFrames: number; compositionWidth: number; inputProps: { storyboard: { scenes: unknown[] }; clips: Record<number, string>; sources: object } };
    expect(props.durationInFrames).toBe(180);
    expect(props.compositionWidth).toBe(1080);
    expect(props.inputProps.storyboard.scenes).toHaveLength(2);
    // The clips are keyed by scene order, as the composition looks them up.
    expect(props.inputProps.clips).toEqual({ 1: "https://signed/clip.mp4" });
    expect(Object.keys(props.inputProps.sources)).toEqual(["mockup-0", "mockup-1"]);
  });

  it("does not start while an AI scene has no clip to play", () => {
    renderPreview(video(preview({ clips: {} })));

    expect(screen.queryByTestId("player")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("An AI scene of this video is not available yet.");
  });

  it("waits for the soundtrack, and says so when it cannot be loaded", () => {
    soundtrack.mockReturnValue({ status: "loading" });
    const { rerender } = renderPreview(video(preview()));
    expect(screen.queryByTestId("player")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing soundtrack");

    soundtrack.mockReturnValue({ status: "failed" });
    rerender(<QueryClientProvider client={new QueryClient()}><ComposedVideoPreview video={video(preview())} /></QueryClientProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("The selected soundtrack could not be loaded");
  });

  it("hands the soundtrack to the composition when it is ready", () => {
    soundtrack.mockReturnValue({ status: "ready", url: "blob:soundtrack" });

    renderPreview(video(preview()));

    expect((player.mock.calls[0]![0] as { inputProps: { music?: string } }).inputProps.music).toBe("blob:soundtrack");
  });

  it("says the final video is being rendered while its file is made", () => {
    renderPreview(video(preview(), "rendering"));

    expect(screen.getByText("The final video is being rendered in the background.")).toBeInTheDocument();
  });

  it("has nothing to play without preview data", () => {
    renderPreview(video(null));

    expect(screen.queryByTestId("player")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The joined preview is being prepared.");
  });
});
