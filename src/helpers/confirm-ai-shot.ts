import { quoteRunGroupAi } from "@/api/run-groups";
import { quoteAiShot } from "@/api/video-workflow";
import { askCostConfirm, type CostLine } from "@/stores/cost-confirm";
import type { AiShotQuote, GenerateVideoConfig } from "@/types/video-workflow";

/** Whether these settings make paid AI clips, so their cost has to be confirmed first. */
export const makesAiClips = (config: GenerateVideoConfig | undefined) =>
  config?.mode === "ai_shot" && !(config.aiScenes?.length && config.aiScenes.every(scene => scene.mode === "standard"));

const modelName = (model: string) =>
  model === "MiniMax-H3-Lite" ? "Economy (MiniMax-H3-Lite)" : model === "MiniMax-H3" ? "Premium (MiniMax-H3)" : model;

const clipCount = (clips: number) => `${clips} AI clip${clips === 1 ? "" : "s"}`;

/** The confirmed quote's token, or null when the seller declined. A batch quote lists each design's part. */
async function ask(quote: AiShotQuote): Promise<string | null> {
  const models = quote.model.split(", ").filter(Boolean).map(modelName).join(", ");
  if (quote.newClips === 0) {
    const reuse = await askCostConfirm({
      title: "Render with the clips already made?",
      description: "All AI clips can be reused. No new paid video generation is expected.",
      lines: [],
      totalUsd: 0,
      confirmLabel: "Render",
    });
    return reuse ? quote.token : null;
  }
  const lines: CostLine[] = quote.items?.length
    ? quote.items.map(item => ({
        label: item.label,
        detail: `${clipCount(item.clips)} · ${Number(item.seconds.toFixed(1))} s`,
        amountUsd: item.estimatedCostUsd,
      }))
    : [{ label: `${quote.newClips} new ${quote.newClips === 1 ? "AI clip" : "AI clips"}`, detail: models, amountUsd: quote.estimatedCostUsd }];
  const confirmed = await askCostConfirm({
    title: `Generate ${clipCount(quote.newClips)}?`,
    description: `Made with ${models}. The final result may differ from the source image.`,
    lines,
    totalUsd: quote.estimatedCostUsd,
    note: quote.note,
    confirmLabel: "Generate",
  });
  return confirmed ? quote.token : null;
}

export async function confirmAiShot(runId: string, config: GenerateVideoConfig, regenerate = false, sceneOrder?: number,
  expectedStoryboardFingerprint?: string): Promise<string | null> {
  if (!makesAiClips(config)) return "";
  return ask(await quoteAiShot(runId, config, regenerate, sceneOrder, expectedStoryboardFingerprint));
}

/** The AI clips of a batch video run: every design's cost is confirmed once, before any of them render. */
export async function confirmRunGroupAiShot(groupId: string, expectedRevision: number): Promise<string | null> {
  return ask(await quoteRunGroupAi({ groupId, expectedRevision }));
}
