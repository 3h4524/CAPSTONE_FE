import { beforeEach, describe, expect, it, vi } from "vitest";

import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ groupId: null as string | null, run: undefined as { id: string } | undefined }));

vi.mock("@/hooks/queries/use-run-group", () => ({ useRunGroupId: () => mocks.groupId }));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: mocks.run }) }));
vi.mock("@/components/workflows/config-panel/mockup-approval-results", () => ({
  MockupApprovalResults: () => <p>mock-ups to review</p>,
}));
vi.mock("@/components/workflows/config-panel/node-config-form", () => ({
  NodeConfigForm: ({ showResults = true }: { showResults?: boolean }) => (
    <p>{showResults ? "settings with the review" : "settings only"}</p>
  ),
}));
vi.mock("@/components/workflows/run/run-results-panel", () => ({ RunResultsPanel: () => <p>design results</p> }));
vi.mock("@/components/workflows/config-panel/layout/panel-header", () => ({
  PanelHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
}));

const gate = buildWorkflowNode({ id: "gate", data: { type: "approval-gate", label: "Mockup Approval", config: { mode: "auto" }, status: "idle" } });

describe("NodeConfigPanel for Mockup Approval", () => {
  beforeEach(() => {
    mocks.groupId = null;
    mocks.run = undefined;
    useWorkflowStore.setState({ nodes: [gate], selectedNodeIds: ["gate"] });
  });

  it("shows the settings with the review in them while no run is open", () => {
    render(<NodeConfigPanel />);

    expect(screen.getByText("settings with the review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Results/ })).not.toBeInTheDocument();
  });

  it("splits Results and Settings once a batch video run is open, opening on the results", async () => {
    mocks.groupId = "group-1";
    render(<NodeConfigPanel />);

    expect(screen.getByRole("button", { name: /Results/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("mock-ups to review")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Settings/ }));
    // The settings tab has the mode, not the review a second time.
    expect(screen.getByText("settings only")).toBeInTheDocument();
    expect(screen.queryByText("mock-ups to review")).not.toBeInTheDocument();
  });

  it("splits them for one product's video run too", () => {
    mocks.run = { id: "run-1" };
    render(<NodeConfigPanel />);

    expect(screen.getByRole("button", { name: /Settings/ })).toBeInTheDocument();
  });
});
