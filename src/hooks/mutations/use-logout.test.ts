import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useLogin } from "@/hooks/mutations/use-login";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";
import { buildAuthenticatedUser } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");
vi.mock("@/helpers/log", () => ({
  Log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const LOGOUT_URL = new URL("/api/auth/logout", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const initialAuthState = useAuthStore.getState();

const renderLogout = () =>
  renderQueryHook(() => {
    const { mutate: signOut, isSuccess: isSignOutSuccess, isError: isSignOutError } = useLogout();
    return { signOut, isSignOutSuccess, isSignOutError };
  });

describe("useLogout", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    server.use(http.post(LOGOUT_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("clears the session, clears cache and toasts on success", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().markHydrated();
    const { result, queryClient } = renderLogout();
    queryClient.setQueryData(["profile"], { id: "user-1" });
    const clearSpy = vi.spyOn(queryClient, "clear");

    act(() => {
      result.current.signOut(undefined);
    });

    await waitFor(() => expect(result.current.isSignOutSuccess).toBe(true));

    expect(useAuthStore.getState().user).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("success", "Signed out");
  });

  it("clears the session locally and warns when the server fails", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    server.use(
      http.post(LOGOUT_URL, () => HttpResponse.json({ message: "Boom" }, { status: 500 }))
    );

    const { result, queryClient } = renderLogout();
    const clearSpy = vi.spyOn(queryClient, "clear");

    act(() => {
      result.current.signOut(undefined);
    });

    await waitFor(() => expect(result.current.isSignOutError).toBe(true));

    expect(useAuthStore.getState().user).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      "warning",
      "Signed out locally. Please sign in again if the problem persists."
    );
  });

  it("forwards call-site onSuccess after the default cleanup", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    const { result } = renderLogout();
    const onSuccess = vi.fn();

    act(() => {
      result.current.signOut(undefined, { onSuccess });
    });

    await waitFor(() => expect(result.current.isSignOutSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: signOut } = useLogout();
      const { mutate: login } = useLogin();
      return { signOut, login };
    });

    expect(result.current.signOut).toBeTypeOf("function");
    expect(result.current.login).toBeTypeOf("function");
  });
});
