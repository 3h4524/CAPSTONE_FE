import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useProfile } from "@/hooks/queries/use-profile";
import { buildProfile } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const PROFILE_URL = new URL("/api/profile", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const createProfileResponder = () => vi.fn(() => HttpResponse.json(buildProfile()));

describe("useProfile", () => {
  let profileRequest: ReturnType<typeof createProfileResponder>;

  beforeEach(() => {
    profileRequest = createProfileResponder();
    server.use(http.get(PROFILE_URL, profileRequest));
  });

  it("moves from loading to success and returns the profile", async () => {
    const { result } = renderQueryHook(() => useProfile());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(buildProfile());
  });

  it("calls the endpoint exactly once because the wrapper disables retries", async () => {
    const { result } = renderQueryHook(() => useProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(profileRequest).toHaveBeenCalledTimes(1);
  });

  it("skips the request while disabled", () => {
    const { result } = renderQueryHook(() => useProfile(false));

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(profileRequest).not.toHaveBeenCalled();
  });

  it("requests the profile as soon as the caller enables the hook", async () => {
    const { result, rerender } = renderQueryHook(
      (enabled: boolean) => useProfile(enabled),
      { initialProps: false }
    );

    expect(profileRequest).not.toHaveBeenCalled();

    rerender(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileRequest).toHaveBeenCalledTimes(1);
  });

  it("shows a dedicated toast when the profile cannot be loaded", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Boom" }, { status: 500 })
    );
    server.use(http.get(PROFILE_URL, failingRequest));

    const { result } = renderQueryHook(() => useProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("error", "Could not load your profile.");
    expect(failingRequest).toHaveBeenCalledTimes(1);
  });

  it("stays silent on 401 so the refresh flow can take over", async () => {
    const unauthorizedRequest = vi.fn(() =>
      HttpResponse.json({ message: "expired" }, { status: 401 })
    );
    server.use(http.get(PROFILE_URL, unauthorizedRequest));

    const { result } = renderQueryHook(() => useProfile());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(showToast).not.toHaveBeenCalled();
    expect(unauthorizedRequest).toHaveBeenCalledTimes(2);
  });
});
