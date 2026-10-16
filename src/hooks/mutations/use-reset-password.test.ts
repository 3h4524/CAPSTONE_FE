import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { useResetPassword } from "@/hooks/mutations/use-reset-password";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const RESET_URL = new URL(
  "/api/auth/reset-password",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const resetPayload = { token: "reset-token", newPassword: "Valid1234" };

const renderResetPassword = () =>
  renderQueryHook(() => {
    const {
      mutate: updatePassword,
      isSuccess: isUpdateSuccess,
      isError: isUpdateError,
    } = useResetPassword();
    return { updatePassword, isUpdateSuccess, isUpdateError };
  });

describe("useResetPassword", () => {
  beforeEach(() => {
    server.use(http.post(RESET_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("toasts and navigates to login on success", async () => {
    const { result } = renderResetPassword();

    act(() => {
      result.current.updatePassword(resetPayload);
    });

    await waitFor(() => expect(result.current.isUpdateSuccess).toBe(true));

    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Your password has been updated. Sign in with your new password."
    );
    expect(routerPush).toHaveBeenCalledWith("/login");
  });

  it("suppresses the default toast on an invalid token so the form shows it inline", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "This link is invalid or expired." }, { status: 400 })
    );
    server.use(http.post(RESET_URL, failingRequest));

    const { result } = renderResetPassword();
    const onError = vi.fn();

    act(() => {
      result.current.updatePassword(resetPayload, { onError });
    });

    await waitFor(() => expect(result.current.isUpdateError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: updatePassword } = useResetPassword();
      const { mutate: requestReset } = useForgotPassword();
      return { updatePassword, requestReset };
    });

    expect(result.current.updatePassword).toBeTypeOf("function");
    expect(result.current.requestReset).toBeTypeOf("function");
  });
});
