import { describe, expect, it, vi } from "vitest";

import { StandardVideoPreview } from "@/components/workflows/media/standard-video-composition";
import type { VideoStoryboard } from "@/types/video-workflow";
import { render } from "@testing-library/react";

const frame = vi.hoisted(() => ({ current: 0 }));

// Remotion's timeline needs its Player; here each piece is a plain element that shows what it was given.
vi.mock("remotion", () => ({
  AbsoluteFill: ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => <div style={style}>{children}</div>,
  Sequence: ({ children, from, durationInFrames, premountFor, postmountFor }: { children?: React.ReactNode; from: number; durationInFrames: number; premountFor?: number; postmountFor?: number }) => (
    <div data-testid="sequence" data-from={from} data-duration={durationInFrames} data-premount={premountFor} data-postmount={postmountFor}>{children}</div>
  ),
  Video: ({ src, trimBefore, muted, style }: { src: string; trimBefore?: number; muted?: boolean; style?: React.CSSProperties }) => (
    <video data-testid="clip" src={src} data-trim={trimBefore} muted={muted} style={style} />
  ),
  Audio: () => null,
  useCurrentFrame: () => frame.current,
}));

const crop = { x: 0, y: 0, width: 1, height: 1 };
const scene = (sceneOrder: number, generationStrategy: "standard" | "ai_shot", extra: Record<string, unknown> = {}) => ({
  mockupId: `source-${sceneOrder}`, sourceRevision: 1, sourceHash: "hash", role: "Hero", sceneOrder, durationFrames: 90,
  crop, endCrop: crop, motion: "static", transition: "none", transitionFrames: 0, text: "", generationStrategy, warnings: [], ...extra,
});
// Scene 1 (photo motion) is frames 0-89, scene 2 (AI) frames 90-179.
const storyboard = {
  template: "product_showcase", templateVersion: 1, durationSeconds: 6, outputDurationFrames: 180, productType: "tshirt", fingerprint: "f",
  outputFormat: "portrait", width: 1080, height: 1440, aspectRatio: "3:4", mode: "ai_shot", transitionOverlapFrames: 0,
  scenes: [scene(0, "standard"), scene(1, "ai_shot", { trimStartFrames: 12, aiCropPosition: { x: 0.25, y: 0.5 }, text: "Soft cotton" })],
} as unknown as VideoStoryboard;
const sources = { "source-0": { url: "https://img/0.png", width: 1080, height: 1440 }, "source-1": { url: "https://img/1.png", width: 1080, height: 1440 } };
const clips = { 1: "https://clips/scene-2.mp4" };

const renderAt = (at: number, withClips = true) => {
  frame.current = at;
  return render(<StandardVideoPreview storyboard={storyboard} sources={sources} clips={withClips ? clips : undefined} />);
};

describe("StandardVideoPreview", () => {
  it("plays an AI scene's clip over its start frame: muted, from its trim, at its crop position, for its frames", () => {
    const { getByTestId, getByText } = renderAt(120);
    const clip = getByTestId("clip");
    expect(clip).toHaveAttribute("src", "https://clips/scene-2.mp4");
    expect(clip).toHaveAttribute("data-trim", "12");
    expect((clip as HTMLVideoElement).muted).toBe(true);
    expect(clip.style.objectPosition).toBe("25% 50%");
    const sequence = getByTestId("sequence");
    expect(sequence).toHaveAttribute("data-from", "90");
    expect(sequence).toHaveAttribute("data-duration", "90");
    // The caption stays readable over the clip.
    expect(clip.compareDocumentPosition(getByText("Soft cotton")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("loads the clip hidden just before its scene, so it is ready when the scene starts", () => {
    const { getByTestId } = renderAt(75);
    const clip = getByTestId("clip");
    expect(clip).toHaveAttribute("src", "https://clips/scene-2.mp4");
    expect(getByTestId("sequence")).toHaveAttribute("data-premount", "30");
    expect(clip.closest("[style*='opacity: 0']")).not.toBeNull();
  });

  it("shows the still start frame of an AI scene that has no clip yet", () => {
    const { queryByTestId, container } = renderAt(120, false);
    expect(queryByTestId("clip")).toBeNull();
    expect(container.querySelector("img[src='https://img/1.png']")).not.toBeNull();
  });

  it("never plays a clip for a photo motion scene", () => {
    frame.current = 30;
    const { queryByTestId, container } = render(
      <StandardVideoPreview storyboard={storyboard} sources={sources} clips={{ 0: "https://clips/wrong.mp4" }} />
    );
    expect(queryByTestId("clip")).toBeNull();
    expect(container.querySelector("img[src='https://img/0.png']")).not.toBeNull();
  });
});
