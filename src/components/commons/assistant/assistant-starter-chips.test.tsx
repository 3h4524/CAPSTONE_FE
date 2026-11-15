import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantStarterChips } from "@/components/commons/assistant/assistant-starter-chips";
import { getAssistantStarterChips } from "@/helpers/assistant-starter-chips";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { renderWithQuery } from "@/test/render-with-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const chipsFor = (pathname: string) => getAssistantStarterChips(pathname, useWorkflowStore.getState());

describe("AssistantStarterChips", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    useWorkflowStore.setState(useWorkflowStore.getInitialState(), true);
    streamAssistantChat.mockReset();
    streamAssistantChat.mockResolvedValue(undefined);
  });

  it.each(["/workflows", "/admin/users", "/dashboard"])("shows the chips for %s", (pathname) => {
    usePathname.mockReturnValue(pathname);

    renderWithQuery(<AssistantStarterChips />);

    chipsFor(pathname).forEach((chip) => expect(screen.getByRole("button", { name: chip })).toBeInTheDocument());
  });

  it("gives workflow and admin pages different suggestions", () => {
    expect(chipsFor("/workflows")).not.toEqual(chipsFor("/admin/users"));
    expect(chipsFor("/workflows")).not.toEqual(chipsFor("/dashboard"));
  });

  it("hides the workflow chips that do not apply to the canvas state", () => {
    usePathname.mockReturnValue("/workflows");
    useWorkflowStore.setState({ workflowId: "wf-1", isDirty: true, selectedNodeIds: [] });

    renderWithQuery(<AssistantStarterChips />);

    expect(screen.getByRole("button", { name: "Why did my last run fail?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Explain the selected step" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run this workflow" })).not.toBeInTheDocument();
  });

  it("sends the chip text as the user's message when clicked", async () => {
    usePathname.mockReturnValue("/dashboard");
    const [first] = chipsFor("/dashboard");
    renderWithQuery(<AssistantStarterChips />);

    await userEvent.click(screen.getByRole("button", { name: first }));

    expect(useAssistantStore.getState().messages[0]).toMatchObject({ role: "user", content: first });
    expect(streamAssistantChat).toHaveBeenCalledTimes(1);
  });
});
