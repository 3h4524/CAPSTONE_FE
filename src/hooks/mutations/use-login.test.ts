import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useLogin } from "@/hooks/mutations/use-login";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const LOGIN_URL = new URL("/api/auth/login", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const loginPayload = { email: "seller@apcs.test", password: "Valid1234" };

const initialAuthState = useAuthStore.getState();

const renderLogin = () =>
  renderQueryHook(() => {
    const { mutate: login, data: loginData, isSuccess: isLoginSuccess, isError: isLoginError } = useLogin();
    return { login, loginData, isLoginSuccess, isLoginError };
  });

describe("useLogin", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    server.use(
      http.post(LOGIN_URL, () => HttpResponse.json({ user: buildAuthenticatedUser() }))
    );
  });

  it("stores the user, toasts, clears cache and navigates on success", async () => {
    const { result, queryClient } = renderLogin();
    const clearSpy = vi.spyOn(queryClient, "clear");

    act(() => {
      result.current.login(loginPayload);
    });

    await waitFor(() => expect(result.current.isLoginSuccess).toBe(true));

    expect(result.current.loginData?.user).toMatchObject({ email: "seller@apcs.test" });
    expect(useAuthStore.getState().user).toMatchObject({ email: "seller@apcs.test" });
    expect(showToast).toHaveBeenCalledWith("success", "Welcome back, Nhat Nguyen");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/dashboard");
  });

  it("forwards call-site onSuccess without touching session on two-factor challenge", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          requiresTwoFactor: true,
          tempToken: "temp-1",
          twoFactorExpiresAtUtc: new Date(Date.now() + 300000).toISOString(),
        })
      )
    );

    const { result } = renderLogin();
    const onSuccess = vi.fn();

    act(() => {
      result.current.login(loginPayload, { onSuccess });
    });

    await waitFor(() => expect(result.current.isLoginSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("ignores a success payload without a user", async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({})));

    const { result } = renderLogin();

    act(() => {
      result.current.login(loginPayload);
    });

    await waitFor(() => expect(result.current.isLoginSuccess).toBe(true));

    expect(useAuthStore.getState().user).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("suppresses the default error toast and surfaces the failure", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Email or password is incorrect." }, { status: 401 })
    );
    server.use(http.post(LOGIN_URL, failingRequest));

    const { result } = renderLogin();

    act(() => {
      result.current.login(loginPayload);
    });

    await waitFor(() => expect(result.current.isLoginError).toBe(true));

    expect(showToast).not.toHaveBeenCalled();
    expect(failingRequest).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("forwards call-site onError for inline form messaging", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({ message: "Email or password is incorrect." }, { status: 401 })
      )
    );

    const { result } = renderLogin();
    const onError = vi.fn();

    act(() => {
      result.current.login(loginPayload, { onError });
    });

    await waitFor(() => expect(result.current.isLoginError).toBe(true));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: login } = useLogin();
      const { mutate: logout } = useLogout();
      return { login, logout };
    });

    expect(result.current.login).toBeTypeOf("function");
    expect(result.current.logout).toBeTypeOf("function");
  });
});
