import { beforeEach, describe, expect, it, vi } from "vitest";

import { batchJobKeys } from "@/api/batch-jobs";
import { useNotificationHub } from "@/hooks/use-notification-hub";
import type * as ReactQuery from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (value: string) => void>,
  invalidate: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactQuery>()),
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));

vi.mock("@microsoft/signalr", () => {
  class HubConnectionBuilder {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return {
        state: "Connected",
        on: (name: string, handler: (value: string) => void) => {
          mocks.handlers[name] = handler;
        },
        onreconnected: vi.fn(),
        start: () => Promise.resolve(),
        stop: () => Promise.resolve(),
      };
    }
  }
  return { HubConnectionBuilder, LogLevel: {} };
});

describe("useNotificationHub", () => {
  beforeEach(() => mocks.invalidate.mockClear());

  it("reads a design job again as soon as the server says it changed", async () => {
    const { result } = renderHook(() => useNotificationHub());
    await waitFor(() => expect(result.current.isConnected).toBe(true));

    mocks.handlers.DesignJobChanged("job-1");

    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: batchJobKeys.detail("job-1") });
  });
});
