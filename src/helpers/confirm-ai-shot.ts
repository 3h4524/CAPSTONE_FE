import { quoteAiShot } from "@/api/video-workflow";
import type { GenerateVideoConfig } from "@/types/video-workflow";

export async function confirmAiShot(runId: string, config: GenerateVideoConfig, regenerate = false, sceneOrder?: number,
  expectedStoryboardFingerprint?: string): Promise<string | null> {
  if (config.mode !== "ai_shot") return "";
  if (config.aiScenes?.length && config.aiScenes.every(scene => scene.mode === "standard")) return "";
  const quote = await quoteAiShot(runId, config, regenerate, sceneOrder, expectedStoryboardFingerprint);
  const cost = quote.estimatedCostUsd.toFixed(2);
  const question = quote.newClips === 0
    ? "All AI clips can be reused. No new paid video generation is expected. Continue rendering?"
    : `Generate ${quote.newClips} new AI clip${quote.newClips === 1 ? "" : "s"} with ${quote.model}? Estimated provider charge: US$${cost}. ${quote.note} The final result may differ from the source image. Continue?`;
  return window.confirm(question) ? quote.token : null;
}
