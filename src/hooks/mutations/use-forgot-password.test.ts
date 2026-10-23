import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { useResendVerificationEmail } from "@/hooks/mutations/use-resend-verification-email";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const FORGOT_URL = new URL(
  "/api/auth/forgot-password",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const renderForgotPassword = () =>
  renderQueryHook(() => {
    const {
      mutate: requestReset,
      isSuccess: isResetRequested,
      isError: isResetError,
    } = useForgotPassword();
    return { requestReset, isResetRequested, isResetError };
  });

describe("useForgotPassword", () => {
  beforeEach(() => {
    server.use(http.post(FORGOT_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("resolves on success so the form can show the confirmation", async () => {
    const { result } = renderForgotPassword();

    act(() => {
      result.current.requestReset("seller@apcs.test");
    });

    await waitFor(() => expect(result.current.isResetRequested).toBe(true));
  });

  it("forwards call-site onSuccess with the requested email", async () => {
    const { result } = renderForgotPassword();
    const onSuccess = vi.fn();

    act(() => {
      result.current.requestReset("seller@apcs.test", { onSuccess });
    });

    await waitFor(() => expect(result.current.isResetRequested).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows the default toast on failure exactly once", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Unable to send reset email." }, { status: 500 })
    );
    server.use(http.post(FORGOT_URL, failingRequest));

    const { result } = renderForgotPassword();

    act(() => {
      result.current.requestReset("seller@apcs.test");
    });

    await waitFor(() => expect(result.current.isResetError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("error", "Unable to send reset email.");
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: requestReset } = useForgotPassword();
      const { mutate: resendVerification } = useResendVerificationEmail();
      return { requestReset, resendVerification };
    });

    expect(result.current.requestReset).toBeTypeOf("function");
    expect(result.current.resendVerification).toBeTypeOf("function");
  });
});
