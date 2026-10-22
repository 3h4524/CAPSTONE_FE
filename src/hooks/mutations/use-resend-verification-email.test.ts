import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { useResendVerificationEmail } from "@/hooks/mutations/use-resend-verification-email";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const RESEND_URL = new URL(
  "/api/auth/resend-verification",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const renderResendVerification = () =>
  renderQueryHook(() => {
    const {
      mutate: resendVerification,
      isSuccess: isResendSuccess,
      isError: isResendError,
    } = useResendVerificationEmail();
    return { resendVerification, isResendSuccess, isResendError };
  });

describe("useResendVerificationEmail", () => {
  beforeEach(() => {
    server.use(http.post(RESEND_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("toasts on success", async () => {
    const { result } = renderResendVerification();

    act(() => {
      result.current.resendVerification("seller@apcs.test");
    });

    await waitFor(() => expect(result.current.isResendSuccess).toBe(true));

    expect(showToast).toHaveBeenCalledWith(
      "success",
      "If that address is registered, a new verification email is on its way."
    );
  });

  it("shows the default toast on failure exactly once", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Unable to resend verification email." }, { status: 500 })
    );
    server.use(http.post(RESEND_URL, failingRequest));

    const { result } = renderResendVerification();

    act(() => {
      result.current.resendVerification("seller@apcs.test");
    });

    await waitFor(() => expect(result.current.isResendError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("error", "Unable to resend verification email.");
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: resendVerification } = useResendVerificationEmail();
      const { mutate: requestReset } = useForgotPassword();
      return { resendVerification, requestReset };
    });

    expect(result.current.resendVerification).toBeTypeOf("function");
    expect(result.current.requestReset).toBeTypeOf("function");
  });
});
