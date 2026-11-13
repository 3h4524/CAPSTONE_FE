import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSyncGeneratedMockups } from "@/hooks/use-sync-generated-mockups";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  importGeneratedMockups: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/api/generated-mockups", () => ({ importGeneratedMockups: mocks.importGeneratedMockups }));
vi.mock("@/helpers/toast", () => ({ showWorkflowActionToast: mocks.showToast }));
vi.mock("@/hooks/use-query-client", () => ({
  useAppQueryClient: () => ({ setQueryData: mocks.setQueryData, invalidateQueries: mocks.invalidateQueries }),
}));

const page = (importedCount: number, failedCount = 0) => ({ importedCount, failedCount, mockups: [{ id: `m-${importedCount}` }] });

describe("useSyncGeneratedMockups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports each product once, stores its list and reads the group again when something was added", async () => {
    mocks.importGeneratedMockups.mockImplementation((productId: string) => Promise.resolve(productId === "p1" ? page(3) : page(0)));
    const { result } = renderHook(() => useSyncGeneratedMockups("group-1", ["p2", "p1", "p1"]));

    await waitFor(() => expect(result.current).toBe(false));
    expect(mocks.importGeneratedMockups).toHaveBeenCalledTimes(2);
    expect(mocks.setQueryData).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(["group-1"]) });
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it("leaves the group alone when nothing new was made", async () => {
    mocks.importGeneratedMockups.mockResolvedValue(page(0));
    const { result } = renderHook(() => useSyncGeneratedMockups("group-1", ["p1"]));

    await waitFor(() => expect(result.current).toBe(false));
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it("asks again while the server answers with a full page", async () => {
    mocks.importGeneratedMockups.mockResolvedValueOnce(page(24)).mockResolvedValueOnce(page(5));
    const { result } = renderHook(() => useSyncGeneratedMockups("group-1", ["p1"]));

    await waitFor(() => expect(result.current).toBe(false));
    expect(mocks.importGeneratedMockups).toHaveBeenCalledTimes(2);
  });

  it("does not import again on a re-render with the same products", async () => {
    mocks.importGeneratedMockups.mockResolvedValue(page(0));
    const { result, rerender } = renderHook(({ ids }) => useSyncGeneratedMockups("group-1", ids), { initialProps: { ids: ["p1"] } });
    await waitFor(() => expect(result.current).toBe(false));

    rerender({ ids: ["p1"] });
    expect(mocks.importGeneratedMockups).toHaveBeenCalledTimes(1);
  });

  it("says how many mock-ups could not be added", async () => {
    mocks.importGeneratedMockups.mockImplementation((productId: string) =>
      productId === "p2" ? Promise.reject(new Error("offline")) : Promise.resolve(page(1, 2))
    );
    const { result } = renderHook(() => useSyncGeneratedMockups("group-1", ["p1", "p2"]));

    await waitFor(() => expect(result.current).toBe(false));
    expect(mocks.showToast).toHaveBeenCalledWith("warning", expect.stringContaining("3 new mock-ups"));
  });
});
