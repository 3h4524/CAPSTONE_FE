import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantStarterChips } from "@/components/commons/assistant/assistant-starter-chips";
import { ASSISTANT_STARTER_CHIPS } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { renderWithQuery } from "@/test/render-with-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const chipsFor = (pathname: string) => ASSISTANT_STARTER_CHIPS.find((group) => group.match(pathname))?.chips ?? [];

describe("AssistantStarterChips", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
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

  it("sends the chip text as the user's message when clicked", async () => {
    usePathname.mockReturnValue("/dashboard");
    const [first] = chipsFor("/dashboard");
    renderWithQuery(<AssistantStarterChips />);

    await userEvent.click(screen.getByRole("button", { name: first }));

    expect(useAssistantStore.getState().messages[0]).toMatchObject({ role: "user", content: first });
    expect(streamAssistantChat).toHaveBeenCalledTimes(1);
  });
});
