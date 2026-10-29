import { describe, expect, it } from "vitest";

import { AssistantToolStatus } from "@/components/commons/assistant/assistant-tool-status";
import type { AssistantToolActivity } from "@/types/assistant";
import { render, screen } from "@testing-library/react";

const tools: AssistantToolActivity[] = [
  { callId: "1", name: "get_node_catalog", status: "ok" },
  { callId: "2", name: "edit_workflow_canvas", status: "running" },
];

describe("AssistantToolStatus", () => {
  it("lists friendly steps while the reply is streaming", () => {
    render(<AssistantToolStatus tools={tools} isStreaming />);

    expect(screen.getByText("Checked step settings")).toBeInTheDocument();
    expect(screen.getByText("Preparing the canvas changes")).toBeInTheDocument();
    expect(screen.queryByText(/get_node_catalog|edit_workflow_canvas/)).not.toBeInTheDocument();
  });

  it("collapses to one summary line once the reply is finished", () => {
    render(<AssistantToolStatus tools={tools.map((tool) => ({ ...tool, status: "ok" as const }))} isStreaming={false} />);

    expect(screen.getByText("Checked step settings · Prepared the canvas changes")).toBeInTheDocument();
  });
});
