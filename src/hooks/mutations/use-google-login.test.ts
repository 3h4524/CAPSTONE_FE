import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useGoogleLogin } from "@/hooks/mutations/use-google-login";
import { useLogin } from "@/hooks/mutations/use-login";
import { useAuthStore } from "@/stores/auth";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const GOOGLE_URL = new URL("/api/auth/google", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const initialAuthState = useAuthStore.getState();

const renderGoogleLogin = (onTwoFactorRequired?: (tempToken: string, expiresAtUtc: string) => void) =>
  renderQueryHook(() => {
    const {
      mutate: googleSignIn,
      data: googleData,
      isSuccess: isGoogleSuccess,
      isError: isGoogleError,
    } = useGoogleLogin(onTwoFactorRequired);
    return { googleSignIn, googleData, isGoogleSuccess, isGoogleError };
  });

describe("useGoogleLogin", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    server.use(
      http.post(GOOGLE_URL, () => HttpResponse.json({ user: buildAuthenticatedUser() }))
    );
  });

  it("stores the user, toasts, clears cache and navigates on success", async () => {
    const { result, queryClient } = renderGoogleLogin();
    const clearSpy = vi.spyOn(queryClient, "clear");

    act(() => {
      result.current.googleSignIn("google-id-token");
    });

    await waitFor(() => expect(result.current.isGoogleSuccess).toBe(true));

    expect(result.current.googleData?.user).toMatchObject({ email: "seller@apcs.test" });
    expect(useAuthStore.getState().user).toMatchObject({ email: "seller@apcs.test" });
    expect(showToast).toHaveBeenCalledWith("success", "Welcome, Nhat Nguyen");
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith("/dashboard");
  });

  it("calls the two-factor callback instead of signing in", async () => {
    const expiresAtUtc = new Date(Date.now() + 300000).toISOString();
    server.use(
      http.post(GOOGLE_URL, () =>
        HttpResponse.json({
          requiresTwoFactor: true,
          tempToken: "temp-google",
          twoFactorExpiresAtUtc: expiresAtUtc,
        })
      )
    );

    const onTwoFactorRequired = vi.fn();
    const { result } = renderGoogleLogin(onTwoFactorRequired);

    act(() => {
      result.current.googleSignIn("google-id-token");
    });

    await waitFor(() => expect(result.current.isGoogleSuccess).toBe(true));

    expect(onTwoFactorRequired).toHaveBeenCalledWith("temp-google", expiresAtUtc);
    expect(useAuthStore.getState().user).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("ignores a success payload without a user", async () => {
    server.use(http.post(GOOGLE_URL, () => HttpResponse.json({})));

    const { result } = renderGoogleLogin();

    act(() => {
      result.current.googleSignIn("google-id-token");
    });

    await waitFor(() => expect(result.current.isGoogleSuccess).toBe(true));

    expect(useAuthStore.getState().user).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("surfaces a server error through the default toast exactly once", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Google sign-in failed." }, { status: 401 })
    );
    server.use(http.post(GOOGLE_URL, failingRequest));

    const { result } = renderGoogleLogin();

    act(() => {
      result.current.googleSignIn("google-id-token");
    });

    await waitFor(() => expect(result.current.isGoogleError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledWith("error", "Google sign-in failed.");
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: googleSignIn } = useGoogleLogin();
      const { mutate: login } = useLogin();
      return { googleSignIn, login };
    });

    expect(result.current.googleSignIn).toBeTypeOf("function");
    expect(result.current.login).toBeTypeOf("function");
  });
});
