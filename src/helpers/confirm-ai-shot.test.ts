import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmAiShot } from "@/helpers/confirm-ai-shot";
import type { GenerateVideoConfig } from "@/types/video-workflow";

const { quoteAiShotMock } = vi.hoisted(() => ({ quoteAiShotMock: vi.fn() }));
vi.mock("@/api/video-workflow", () => ({ quoteAiShot: quoteAiShotMock }));

const aiConfig = {
  mode: "ai_shot",
  aiScenes: [{ mode: "ai" }],
} as GenerateVideoConfig;

describe("confirmAiShot", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
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
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("MiniMax-H3"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Estimated provider charge: US$0.48"));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("system MiniMax account"));
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
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("No new paid video generation"));
    expect(window.confirm).not.toHaveBeenCalledWith(expect.stringContaining("Veo"));
  });

  it("returns null when the seller declines the concrete quote", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
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
});
