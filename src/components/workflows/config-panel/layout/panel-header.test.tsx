import { describe, expect, it, vi } from "vitest";

import { PanelHeader, PanelHeaderCloseContext } from "@/components/workflows/config-panel/layout/panel-header";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const input = buildWorkflowNode({ id: "input", data: { type: "product-input", label: "Product input", config: {}, status: "idle" } });

describe("PanelHeader", () => {
  it("has its own close button, which closes the node's settings", async () => {
    useWorkflowStore.setState({ nodes: [input] });
    const onClose = vi.fn();
    render(<PanelHeader node={input} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Close node settings" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("leaves the close button to a sheet that has one, so only one is shown", () => {
    useWorkflowStore.setState({ nodes: [input] });
    render(
      <PanelHeaderCloseContext.Provider value={false}>
        <PanelHeader node={input} onClose={() => undefined} />
      </PanelHeaderCloseContext.Provider>
    );

    expect(screen.getByRole("heading", { name: "Product input" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close node settings" })).not.toBeInTheDocument();
  });
});
