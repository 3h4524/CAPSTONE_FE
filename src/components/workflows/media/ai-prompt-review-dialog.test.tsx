import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiPromptReviewDialog } from "@/components/workflows/media/ai-prompt-review-dialog";
import { showToast } from "@/helpers/toast";
import type { AiPromptTrace } from "@/types/video-workflow";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast", () => ({ showToast: vi.fn() }));

const finalPrompt = "Template direction\n\nP1 action plan\n\nProduct guardrail";
const trace: AiPromptTrace = {
  ruleVersion: 1,
  ragStatus: "disabled",
  appliedRules: ["p1-start-action-end"],
  warnings: ["P1 uses template defaults."],
  parts: [
    { key: "template", label: "Template prompt", content: "Template direction", includedInFinalPrompt: true },
    { key: "prompt_rules", label: "Prompt rules", content: "P1 action plan", includedInFinalPrompt: true },
    { key: "rag", label: "RAG experience", content: "Disabled: no retrieved experience was added to this prompt.", includedInFinalPrompt: false },
  ],
  finalPrompt,
};

const renderDialog = (onContinue = vi.fn()) => render(
  <AiPromptReviewDialog open prompts={[{ sceneOrder: 0, trace }]} onOpenChange={vi.fn()} onContinue={onContinue} />
);

describe("AiPromptReviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the exact final prompt and every trace part, including disabled RAG", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.getByRole("heading", { name: "Review AI prompt before paid generation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Final prompt for scene 1")).toHaveTextContent(/Template direction\s+P1 action plan\s+Product guardrail/);
    expect(screen.getByText(/RAG:/)).toHaveTextContent(/RAG:\s+disabled/);

    await user.click(screen.getByRole("button", { name: /rag experience/i }));

    expect(screen.getByText("Disabled: no retrieved experience was added to this prompt.")).toBeInTheDocument();
    expect(screen.getByText("Not sent")).toBeInTheDocument();
  });

  it("copies only the exact final prompt for free external testing", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Copy final prompt" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(finalPrompt));
    expect(showToast).toHaveBeenCalledWith("success", expect.stringContaining("copied"));
  });

  it("explains how to proceed when clipboard access is unavailable", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Clipboard denied"));
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Copy final prompt" }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith("error", expect.stringContaining("manually")));
  });

  it("closes for free testing without continuing to paid confirmation", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <AiPromptReviewDialog open prompts={[{ sceneOrder: 0, trace }]} onOpenChange={onOpenChange} onContinue={onContinue} />
    );

    await user.click(screen.getByRole("button", { name: "Close and test prompts" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("does not continue to paid confirmation until the explicit second action", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderDialog(onContinue);

    await user.click(screen.getByRole("button", { name: "Copy final prompt" }));
    expect(onContinue).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue to paid confirmation" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
