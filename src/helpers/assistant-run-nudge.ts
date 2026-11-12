import { ASSISTANT_RUN_NUDGE_RECENT_MS } from "@/constants/assistant";
import type { AssistantRunNudge, AssistantRunProgress } from "@/types/assistant";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const waitingLabel = (progress: AssistantRunProgress) => {
  const count = progress.waitingCount ?? 0;
  if (progress.stage === "design_approval") return `Designs of ${plural(count, "product")} are waiting for your approval`;
  if (progress.stage === "designs_ready") return "Designs are ready for the next step";
  if (progress.stage === "mockups_ready") return "Mock-ups are ready for the video part";
  if (progress.stage === "mockup_approval") return "Mock-ups are waiting for your approval";
  if (progress.stage === "video_review") return `${plural(count, "video")} waiting for your review`;
  return "Your run needs your input";
};

const isRecent = (startedAt: string | null, now: number) =>
  startedAt !== null && now - new Date(startedAt).getTime() <= ASSISTANT_RUN_NUDGE_RECENT_MS;

export const getAssistantRunNudge = (progress: AssistantRunProgress | undefined, now = Date.now()): AssistantRunNudge | null => {
  if (!progress) return null;
  const run = progress.runId ?? progress.runGroupId ?? progress.batchJobId ?? "none";
  const key = `${progress.workflowId}:${run}:${progress.stage}:${progress.state}:${progress.waitingCount ?? ""}`;
  const prompt = `What should I do next with the run of "${progress.workflowName}"?`;
  if (progress.state === "waiting_for_user") return { key, label: waitingLabel(progress), prompt, tone: "action" };
  if (!isRecent(progress.startedAt, now)) return null;
  if (progress.state === "failed") return { key, label: "Your run hit a problem", prompt: `What went wrong with the run of "${progress.workflowName}"?`, tone: "problem" };
  if (progress.state === "done") return { key, label: "Your run is finished", prompt, tone: "done" };
  return null;
};
