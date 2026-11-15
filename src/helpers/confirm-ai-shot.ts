import { quoteAiShot } from "@/api/video-workflow";
import { askCostConfirm, type CostLine } from "@/stores/cost-confirm";
import type { AiShotQuote, GenerateVideoConfig } from "@/types/video-workflow";

/** Whether these settings make paid AI clips. */
export const makesAiClips = (config: GenerateVideoConfig | undefined) =>
  config?.mode === "ai_shot" && !(config.aiScenes?.length && config.aiScenes.every(scene => scene.mode === "standard"));

const modelName = (model: string) =>
  model === "MiniMax-H3-Lite" ? "Economy (MiniMax-H3-Lite)" : model === "MiniMax-H3" ? "Premium (MiniMax-H3)" : model;

const clipCount = (clips: number) => `${clips} AI clip${clips === 1 ? "" : "s"}`;

/**
 * The quote's token, or null when the seller declined. The cost of a run's own clips was shown when it was started,
 * so the seller is asked only when the request makes clips beyond them (other settings, a regeneration), and only for
 * the clips still to make: a retry or a resume with the same settings, or clips already stored, go on without a word.
 */
async function ask(quote: AiShotQuote): Promise<string | null> {
  if (quote.newClips === 0 || !quote.changesWhatIsMade) return quote.token;
  const models = quote.model.split(", ").filter(Boolean).map(modelName).join(", ");
  const lines: CostLine[] = [
    { label: `${quote.newClips} new ${quote.newClips === 1 ? "AI clip" : "AI clips"}`, detail: models, amountUsd: quote.estimatedCostUsd },
  ];
  const confirmed = await askCostConfirm({
    title: `Generate ${clipCount(quote.newClips)}?`,
    description: `Only the clips your change needs are made; the ones already made are kept. Made with ${models}. The final result may differ from the source image.`,
    lines,
    totalUsd: quote.estimatedCostUsd,
    note: quote.note,
    confirmLabel: "Generate",
  });
  return confirmed ? quote.token : null;
}

/**
 * Before the seller starts a run's AI clips again (retry, resume, re-render, regenerate): the token of a quote for
 * these settings, asking first only when they make clips the run's cost did not include. Null when the seller declined.
 */
export async function confirmAiShot(runId: string, config: GenerateVideoConfig, regenerate = false, sceneOrder?: number,
  expectedStoryboardFingerprint?: string): Promise<string | null> {
  if (!makesAiClips(config)) return "";
  return ask(await quoteAiShot(runId, config, regenerate, sceneOrder, expectedStoryboardFingerprint));
}
