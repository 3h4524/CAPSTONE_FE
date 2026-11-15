import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAiShot, makesAiClips } from "@/helpers/confirm-ai-shot";
import type { CostConfirmRequest } from "@/stores/cost-confirm";
import type { AiShotQuote, GenerateVideoConfig } from "@/types/video-workflow";

const { quoteAiShotMock, askMock } = vi.hoisted(() => ({
  quoteAiShotMock: vi.fn(),
  askMock: vi.fn(),
}));
vi.mock("@/api/video-workflow", () => ({ quoteAiShot: quoteAiShotMock }));
vi.mock("@/stores/cost-confirm", () => ({ askCostConfirm: askMock }));

const aiConfig = {
  mode: "ai_shot",
  aiScenes: [{ mode: "ai" }],
} as GenerateVideoConfig;

const quote = (overrides: Partial<AiShotQuote> = {}): AiShotQuote => ({
  token: "quote-token",
  estimatedCostUsd: 0.48,
  newClips: 1,
  expiresAtUtc: "2026-10-28T00:00:00Z",
  model: "MiniMax-H3",
  note: "Estimate only. The system MiniMax account is billed for successful generations.",
  changesWhatIsMade: true,
  ...overrides,
});

const asked = () => askMock.mock.calls.at(-1)![0] as CostConfirmRequest;

describe("confirmAiShot", () => {
  beforeEach(() => {
    askMock.mockReset().mockResolvedValue(true);
  });

  it("shows the cost of only the clips a change makes, with the model and the quote note", async () => {
    quoteAiShotMock.mockResolvedValue(quote());

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBe("quote-token");
    expect(asked().description).toContain("Premium (MiniMax-H3)");
    expect(asked().description).toContain("Only the clips your change needs are made");
    expect(asked().totalUsd).toBe(0.48);
    expect(asked().note).toContain("system MiniMax account");
  });

  it("goes on without asking when the run's own settings are retried or resumed: their cost was shown on Run", async () => {
    quoteAiShotMock.mockResolvedValue(quote({ token: "same-settings", changesWhatIsMade: false }));

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBe("same-settings");
    expect(askMock).not.toHaveBeenCalled();
  });

  it("goes on without asking when every clip is already made", async () => {
    quoteAiShotMock.mockResolvedValue(quote({ token: "reuse-token", estimatedCostUsd: 0, newClips: 0 }));

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBe("reuse-token");
    expect(askMock).not.toHaveBeenCalled();
  });

  it("returns null when the seller declines the cost of a change", async () => {
    askMock.mockResolvedValue(false);
    quoteAiShotMock.mockResolvedValue(quote({ estimatedCostUsd: 0.64 }));

    await expect(confirmAiShot("run-1", aiConfig)).resolves.toBeNull();
  });

  it("binds a prompt-preview fingerprint to the quote", async () => {
    quoteAiShotMock.mockResolvedValue(quote({ estimatedCostUsd: 0, newClips: 0 }));

    await confirmAiShot("run-1", aiConfig, false, undefined, "preview-fingerprint");

    expect(quoteAiShotMock).toHaveBeenCalledWith("run-1", aiConfig, false, undefined, "preview-fingerprint");
  });

  it("asks nothing for settings without AI clips", async () => {
    await expect(confirmAiShot("run-1", { mode: "standard" } as GenerateVideoConfig)).resolves.toBe("");
    expect(askMock).not.toHaveBeenCalled();
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
