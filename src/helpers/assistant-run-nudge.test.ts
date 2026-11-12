import { describe, expect, it } from "vitest";

import { getAssistantRunNudge } from "@/helpers/assistant-run-nudge";
import type { AssistantRunProgress } from "@/types/assistant";

const NOW = new Date("2026-11-12T12:00:00Z").getTime();

const progress = (overrides: Partial<AssistantRunProgress>): AssistantRunProgress => ({
  workflowId: "wf-1",
  workflowName: "Etsy flow",
  stage: "video",
  state: "working",
  nextStep: "",
  done: null,
  total: null,
  waitingCount: null,
  error: null,
  batchJobId: null,
  runGroupId: "g1",
  runId: null,
  startedAt: "2026-11-12T11:00:00Z",
  targets: null,
  ...overrides,
});

describe("getAssistantRunNudge", () => {
  it("says nothing while the run is working or before it starts", () => {
    expect(getAssistantRunNudge(undefined, NOW)).toBeNull();
    expect(getAssistantRunNudge(progress({}), NOW)).toBeNull();
    expect(getAssistantRunNudge(progress({ state: "idle", stage: "not_started", startedAt: null }), NOW)).toBeNull();
  });

  it.each([
    ["design_approval", 2, "Designs of 2 products are waiting for your approval"],
    ["designs_ready", null, "Designs are ready for the next step"],
    ["mockup_approval", 5, "Mock-ups are waiting for your approval"],
    ["video_review", 1, "1 video waiting for your review"],
    ["video", 1, "Your run needs your input"],
  ])("asks for the user at %s", (stage, waitingCount, label) => {
    const nudge = getAssistantRunNudge(progress({ stage, state: "waiting_for_user", waitingCount }), NOW);

    expect(nudge).toMatchObject({ label, tone: "action", prompt: 'What should I do next with the run of "Etsy flow"?' });
  });

  it("reports a recent failure or finish but not an old one", () => {
    expect(getAssistantRunNudge(progress({ state: "failed" }), NOW)?.tone).toBe("problem");
    expect(getAssistantRunNudge(progress({ state: "done", stage: "done" }), NOW)?.label).toBe("Your run is finished");
    expect(getAssistantRunNudge(progress({ state: "done", startedAt: "2026-11-01T00:00:00Z" }), NOW)).toBeNull();
  });

  it("gives each stage of each run its own key so a seen nudge comes back only when something changes", () => {
    const first = getAssistantRunNudge(progress({ stage: "mockup_approval", state: "waiting_for_user", waitingCount: 3 }), NOW);
    const same = getAssistantRunNudge(progress({ stage: "mockup_approval", state: "waiting_for_user", waitingCount: 3 }), NOW);
    const next = getAssistantRunNudge(progress({ stage: "video_review", state: "waiting_for_user", waitingCount: 3 }), NOW);

    expect(same?.key).toBe(first?.key);
    expect(next?.key).not.toBe(first?.key);
  });
});
