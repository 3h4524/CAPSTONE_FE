import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAiShot, confirmRunGroupAiShot, makesAiClips } from "@/helpers/confirm-ai-shot";
import type { CostConfirmRequest } from "@/stores/cost-confirm";
import type { GenerateVideoConfig } from "@/types/video-workflow";

const { quoteAiShotMock, quoteRunGroupAiMock, askMock } = vi.hoisted(() => ({
  quoteAiShotMock: vi.fn(),
  quoteRunGroupAiMock: vi.fn(),
  askMock: vi.fn(),
}));
vi.mock("@/api/video-workflow", () => ({ quoteAiShot: quoteAiShotMock }));
vi.mock("@/api/run-groups", () => ({ quoteRunGroupAi: quoteRunGroupAiMock }));
vi.mock("@/stores/cost-confirm", () => ({ askCostConfirm: askMock }));

const aiConfig = {
  mode: "ai_shot",
  aiScenes: [{ mode: "ai" }],
} as GenerateVideoConfig;

const asked = () => askMock.mock.calls.at(-1)![0] as CostConfirmRequest;

describe("confirmAiShot", () => {
  beforeEach(() => {
    askMock.mockReset().mockResolvedValue(true);
  });

  it("shows the MiniMax model, provider estimate, and quote note before paid generation", async () => {
    quoteAiShotMock.mockResolvedValue({
      token: "quote-token",
      estimatedCostUsd: 0.48,
      newClips: 1,
      expiresAtUtc: "2026-10-28T00:00:00Z",
      model: "MiniMax-H3",
      note: "Estimate only. The system MiniMax account is billed for successful generations.",
    });

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBe("quote-token");
    expect(asked().description).toContain("Premium (MiniMax-H3)");
    expect(asked().totalUsd).toBe(0.48);
    expect(asked().note).toContain("system MiniMax account");
  });

  it("explains that reusable clips do not need a new paid generation", async () => {
    quoteAiShotMock.mockResolvedValue({
      token: "reuse-token",
      estimatedCostUsd: 0,
      newClips: 0,
      expiresAtUtc: "2026-10-28T00:00:00Z",
      model: "MiniMax-H3",
      note: "Estimate only.",
    });

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBe("reuse-token");
    expect(asked().description).toContain("No new paid video generation");
    expect(asked().lines).toEqual([]);
  });

  it("returns null when the seller declines the concrete quote", async () => {
    askMock.mockResolvedValue(false);
    quoteAiShotMock.mockResolvedValue({
      token: "quote-token",
      estimatedCostUsd: 0.64,
      newClips: 1,
      expiresAtUtc: "2026-10-28T00:00:00Z",
      model: "MiniMax-H3",
      note: "Estimate only.",
    });

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBeNull();
  });

  it("binds a prompt-preview fingerprint to the paid quote", async () => {
    quoteAiShotMock.mockResolvedValue({ token: "quote-token", estimatedCostUsd: 0, newClips: 0, expiresAtUtc: "", model: "MiniMax-H3", note: "" });

    await confirmAiShot("run-1", aiConfig, false, undefined, "preview-fingerprint");

    expect(quoteAiShotMock).toHaveBeenCalledWith("run-1", aiConfig, false, undefined, "preview-fingerprint");
  });

  it("asks nothing for settings without AI clips", async () => {
    await expect(confirmAiShot("run-1", { mode: "standard" } as GenerateVideoConfig)).resolves.toBe("");
    expect(askMock).not.toHaveBeenCalled();
  });
});

describe("confirmRunGroupAiShot", () => {
  beforeEach(() => {
    askMock.mockReset().mockResolvedValue(true);
  });

  it("asks once for what every design's clips cost, one line per design", async () => {
    quoteRunGroupAiMock.mockResolvedValue({
      token: "group-token",
      estimatedCostUsd: 1.92,
      newClips: 4,
      expiresAtUtc: "2026-11-10T00:00:00Z",
      model: "MiniMax-H3-Lite",
      note: "Estimate only for 2 videos.",
      items: [
        { label: "Tee · Design 1", clips: 2, seconds: 12, estimatedCostUsd: 0.96 },
        { label: "Tee · Design 2", clips: 2, seconds: 12, estimatedCostUsd: 0.96 },
      ],
    });

    await expect(confirmRunGroupAiShot("group-1", 3)).resolves.toBe("group-token");
    expect(quoteRunGroupAiMock).toHaveBeenCalledWith({ groupId: "group-1", expectedRevision: 3 });
    expect(askMock).toHaveBeenCalledTimes(1);
    expect(asked().title).toContain("4 AI clips");
    expect(asked().lines).toEqual([
      { label: "Tee · Design 1", detail: "2 AI clips · 12 s", amountUsd: 0.96 },
      { label: "Tee · Design 2", detail: "2 AI clips · 12 s", amountUsd: 0.96 },
    ]);
    expect(asked().totalUsd).toBe(1.92);
    expect(asked().note).toContain("Estimate only for 2 videos");
  });

  it("returns null when the seller declines, so nothing starts", async () => {
    askMock.mockResolvedValue(false);
    quoteRunGroupAiMock.mockResolvedValue({ token: "group-token", estimatedCostUsd: 1, newClips: 2, expiresAtUtc: "", model: "MiniMax-H3", note: "" });

    await expect(confirmRunGroupAiShot("group-1", 3)).resolves.toBeNull();
  });
});

describe("makesAiClips", () => {
  it("is true only for AI settings with a scene that is not Standard motion", () => {
    expect(makesAiClips(aiConfig)).toBe(true);
    expect(makesAiClips({ mode: "ai_shot" } as GenerateVideoConfig)).toBe(true);
    expect(makesAiClips({ mode: "ai_shot", aiScenes: [{ mode: "standard" }] } as GenerateVideoConfig)).toBe(false);
    expect(makesAiClips({ mode: "standard", aiScenes: [{ mode: "standard" }] } as GenerateVideoConfig)).toBe(false);
    expect(makesAiClips(undefined)).toBe(false);
  });
});
