import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useAdminTwoFactor } from "@/hooks/mutations/use-admin-two-factor";
import { useResendAdminTwoFactor } from "@/hooks/mutations/use-resend-admin-two-factor";
import { useAuthStore } from "@/stores/auth";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const VERIFY_2FA_URL = new URL(
  "/api/auth/admin/verify-2fa",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const twoFactorPayload = { tempToken: "temp-1", otpCode: "123456" };

const initialAuthState = useAuthStore.getState();

const renderTwoFactor = () =>
  renderQueryHook(() => {
    const {
      mutate: verifyTwoFactor,
      data: twoFactorData,
      isSuccess: isTwoFactorSuccess,
      isError: isTwoFactorError,
    } = useAdminTwoFactor();
    return { verifyTwoFactor, twoFactorData, isTwoFactorSuccess, isTwoFactorError };
  });

describe("useAdminTwoFactor", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    server.use(
      http.post(VERIFY_2FA_URL, () => HttpResponse.json({ user: buildAuthenticatedUser() }))
    );
  });

  it("stores the user, toasts and navigates to the admin dashboard on success", async () => {
    const { result } = renderTwoFactor();

    act(() => {
      result.current.verifyTwoFactor(twoFactorPayload);
    });

    await waitFor(() => expect(result.current.isTwoFactorSuccess).toBe(true));

    expect(result.current.twoFactorData?.user).toMatchObject({ email: "seller@apcs.test" });
    expect(useAuthStore.getState().user).toMatchObject({ email: "seller@apcs.test" });
    expect(showToast).toHaveBeenCalledWith("success", "Welcome, Nhat Nguyen");
    expect(routerPush).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("ignores a success payload without a user", async () => {
    server.use(http.post(VERIFY_2FA_URL, () => HttpResponse.json({})));

    const { result } = renderTwoFactor();

    act(() => {
      result.current.verifyTwoFactor(twoFactorPayload);
    });

    await waitFor(() => expect(result.current.isTwoFactorSuccess).toBe(true));

    expect(useAuthStore.getState().user).toBeNull();
    expect(showToast).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("surfaces an invalid code through the default toast exactly once", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Invalid code." }, { status: 400 })
    );
    server.use(http.post(VERIFY_2FA_URL, failingRequest));

    const { result } = renderTwoFactor();
    const onError = vi.fn();

    act(() => {
      result.current.verifyTwoFactor(twoFactorPayload, { onError });
    });

    await waitFor(() => expect(result.current.isTwoFactorError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: verifyTwoFactor } = useAdminTwoFactor();
      const { mutate: resendTwoFactor } = useResendAdminTwoFactor();
      return { verifyTwoFactor, resendTwoFactor };
    });

    expect(result.current.verifyTwoFactor).toBeTypeOf("function");
    expect(result.current.resendTwoFactor).toBeTypeOf("function");
  });
});
