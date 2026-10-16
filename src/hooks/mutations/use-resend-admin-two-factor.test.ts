import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useAdminTwoFactor } from "@/hooks/mutations/use-admin-two-factor";
import { useResendAdminTwoFactor } from "@/hooks/mutations/use-resend-admin-two-factor";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const RESEND_OTP_URL = new URL(
  "/api/auth/admin/resend-otp",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const resendPayload = "temp-1";

const resendResult = {
  tempToken: "temp-2",
  expiresAtUtc: new Date(Date.now() + 300000).toISOString(),
};

const renderResendTwoFactor = () =>
  renderQueryHook(() => {
    const {
      mutate: resendTwoFactor,
      data: resendData,
      isSuccess: isResendSuccess,
      isError: isResendError,
    } = useResendAdminTwoFactor();
    return { resendTwoFactor, resendData, isResendSuccess, isResendError };
  });

describe("useResendAdminTwoFactor", () => {
  beforeEach(() => {
    server.use(http.post(RESEND_OTP_URL, () => HttpResponse.json(resendResult)));
  });

  it("returns the renewed challenge on success", async () => {
    const { result } = renderResendTwoFactor();

    act(() => {
      result.current.resendTwoFactor(resendPayload);
    });

    await waitFor(() => expect(result.current.isResendSuccess).toBe(true));

    expect(result.current.resendData).toEqual(resendResult);
  });

  it("forwards call-site onSuccess with the renewed challenge", async () => {
    const { result } = renderResendTwoFactor();
    const onSuccess = vi.fn();

    act(() => {
      result.current.resendTwoFactor(resendPayload, { onSuccess });
    });

    await waitFor(() => expect(result.current.isResendSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(
      resendResult,
      resendPayload,
      undefined,
      expect.anything()
    );
  });

  it("shows the default toast on failure exactly once", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Unable to resend the code." }, { status: 500 })
    );
    server.use(http.post(RESEND_OTP_URL, failingRequest));

    const { result } = renderResendTwoFactor();

    act(() => {
      result.current.resendTwoFactor(resendPayload);
    });

    await waitFor(() => expect(result.current.isResendError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("error", "Unable to resend the code.");
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: resendTwoFactor } = useResendAdminTwoFactor();
      const { mutate: verifyTwoFactor } = useAdminTwoFactor();
      return { resendTwoFactor, verifyTwoFactor };
    });

    expect(result.current.resendTwoFactor).toBeTypeOf("function");
    expect(result.current.verifyTwoFactor).toBeTypeOf("function");
  });
});
