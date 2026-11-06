import { beforeEach, describe, expect, it } from "vitest";

import { AssistantNavigateChip } from "@/components/commons/assistant/assistant-navigate-chip";
import { useAssistantStore } from "@/stores/assistant";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { renderWithQuery } from "@/test/render-with-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("AssistantNavigateChip", () => {
  beforeEach(() => {
    routerPush.mockClear();
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
  });

  it("navigates to an allowed app page", async () => {
    renderWithQuery(<AssistantNavigateChip payload={{ path: "/usage", label: "Open usage" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Open usage" }));

    expect(routerPush).toHaveBeenCalledWith("/usage");
  });

  it.each(["https://evil.example/", "//evil.example", "/unknown", "/workflows?id=not-a-guid", "/admin/../secret"])(
    "renders nothing for %s",
    (path) => {
      const { container } = renderWithQuery(<AssistantNavigateChip payload={{ path, label: "Go" }} />);

      expect(container).toBeEmptyDOMElement();
    }
  );

  it("accepts a workflow link with a run id", async () => {
    const path = "/workflows?id=11111111-1111-1111-1111-111111111111&run=22222222-2222-2222-2222-222222222222";
    renderWithQuery(<AssistantNavigateChip payload={{ path, label: "Open run" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Open run" }));

    expect(routerPush).toHaveBeenCalledWith(path);
  });
});
