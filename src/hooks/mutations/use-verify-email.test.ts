import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { useVerifyEmail } from "@/hooks/mutations/use-verify-email";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const VERIFY_URL = new URL(
  "/api/auth/verify-email",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const renderVerifyEmail = () =>
  renderQueryHook(() => {
    const {
      mutate: verifyAddress,
      isSuccess: isVerifySuccess,
      isError: isVerifyError,
    } = useVerifyEmail();
    return { verifyAddress, isVerifySuccess, isVerifyError };
  });

describe("useVerifyEmail", () => {
  beforeEach(() => {
    server.use(http.post(VERIFY_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("resolves without a payload on success", async () => {
    const { result } = renderVerifyEmail();

    act(() => {
      result.current.verifyAddress("valid-token");
    });

    await waitFor(() => expect(result.current.isVerifySuccess).toBe(true));

    expect(result.current.isVerifyError).toBe(false);
  });

  it("forwards call-site onSuccess for the status screen", async () => {
    const { result } = renderVerifyEmail();
    const onSuccess = vi.fn();

    act(() => {
      result.current.verifyAddress("valid-token", { onSuccess });
    });

    await waitFor(() => expect(result.current.isVerifySuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("suppresses the default toast on an expired token and forwards onError", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "This link is invalid or expired." }, { status: 400 })
    );
    server.use(http.post(VERIFY_URL, failingRequest));

    const { result } = renderVerifyEmail();
    const onError = vi.fn();

    act(() => {
      result.current.verifyAddress("expired-token", { onError });
    });

    await waitFor(() => expect(result.current.isVerifyError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: verifyAddress } = useVerifyEmail();
      const { mutate: forgotPassword } = useForgotPassword();
      return { verifyAddress, forgotPassword };
    });

    expect(result.current.verifyAddress).toBeTypeOf("function");
    expect(result.current.forgotPassword).toBeTypeOf("function");
  });
});
