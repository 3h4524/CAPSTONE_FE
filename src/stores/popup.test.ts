import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePopupStore } from "@/stores/popup";

const initialState = usePopupStore.getState();

describe("usePopupStore", () => {
  beforeEach(() => {
    usePopupStore.setState(initialState, true);
  });

  it("starts closed with the default labels", () => {
    const state = usePopupStore.getState();

    expect(state.isOpen).toBe(false);
    expect(state.title).toBe("");
    expect(state.description).toBeUndefined();
    expect(state.positiveLabel).toBe("Confirm");
    expect(state.negativeLabel).toBe("Cancel");
    expect(state.showCloseButton).toBe(true);
  });

  it("openPopup applies the supplied copy", () => {
    usePopupStore.getState().openPopup({
      title: "Delete batch",
      description: "Products will be removed too.",
      positiveLabel: "Delete",
      negativeLabel: "Keep",
      showCloseButton: false,
    });

    const state = usePopupStore.getState();

    expect(state.isOpen).toBe(true);
    expect(state.title).toBe("Delete batch");
    expect(state.description).toBe("Products will be removed too.");
    expect(state.positiveLabel).toBe("Delete");
    expect(state.negativeLabel).toBe("Keep");
    expect(state.showCloseButton).toBe(false);
  });

  it("openPopup falls back to the default labels and keeps the close button", () => {
    usePopupStore.getState().openPopup({ title: "Discard changes?" });

    const state = usePopupStore.getState();

    expect(state.positiveLabel).toBe("Confirm");
    expect(state.negativeLabel).toBe("Cancel");
    expect(state.showCloseButton).toBe(true);
    expect(state.description).toBeUndefined();
  });

  it("openPopup replaces the copy of the popup already on screen", () => {
    usePopupStore
      .getState()
      .openPopup({ title: "First", description: "First description", positiveLabel: "Yes" });

    usePopupStore.getState().openPopup({ title: "Second", positiveLabel: "No" });

    const state = usePopupStore.getState();

    expect(state.title).toBe("Second");
    expect(state.positiveLabel).toBe("No");
    expect(state.description).toBeUndefined();
  });

  it("openPopup stores the positive handler", () => {
    const onPositive = vi.fn();

    usePopupStore.getState().openPopup({ title: "Publish now?", onPositive });

    usePopupStore.getState().onPositive?.();

    expect(onPositive).toHaveBeenCalledTimes(1);
  });

  it("openPopup stores the negative handler", () => {
    const onNegative = vi.fn();

    usePopupStore.getState().openPopup({ title: "Publish now?", onNegative });

    usePopupStore.getState().onNegative?.();

    expect(onNegative).toHaveBeenCalledTimes(1);
  });

  it("closePopup hides the popup and clears both handlers", () => {
    const onPositive = vi.fn();
    const onNegative = vi.fn();
    usePopupStore.getState().openPopup({ title: "Publish now?", onPositive, onNegative });

    usePopupStore.getState().closePopup();

    const state = usePopupStore.getState();

    expect(state.isOpen).toBe(false);
    expect(state.onPositive).toBeUndefined();
    expect(state.onNegative).toBeUndefined();
  });

  it("closePopup keeps the copy so a reopened popup can be compared", () => {
    usePopupStore.getState().openPopup({ title: "Publish now?", positiveLabel: "Publish" });

    usePopupStore.getState().closePopup();

    const state = usePopupStore.getState();

    expect(state.title).toBe("Publish now?");
    expect(state.positiveLabel).toBe("Publish");
  });

  it("dropping the handler of the closed popup does not run the previous one", () => {
    const onPositive = vi.fn();
    usePopupStore.getState().openPopup({ title: "Publish now?", onPositive });

    usePopupStore.getState().closePopup();
    usePopupStore.getState().onPositive?.();

    expect(onPositive).not.toHaveBeenCalled();
  });

  it("keeps the actions available across close and reopen cycles", () => {
    const onPositive = vi.fn();
    usePopupStore.getState().openPopup({ title: "Publish now?", onPositive });
    usePopupStore.getState().closePopup();

    usePopupStore.getState().openPopup({ title: "Publish now?", onPositive });
    usePopupStore.getState().onPositive?.();

    expect(usePopupStore.getState().isOpen).toBe(true);
    expect(onPositive).toHaveBeenCalledTimes(1);
  });
});
