import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useChangePassword } from "@/hooks/mutations/use-change-password";
import { useResetPassword } from "@/hooks/mutations/use-reset-password";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const CHANGE_URL = new URL(
  "/api/auth/change-password",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const changePayload = { currentPassword: "OldValid123", newPassword: "NewValid123" };

const renderChangePassword = () =>
  renderQueryHook(() => {
    const {
      mutate: rotatePassword,
      isSuccess: isRotateSuccess,
      isError: isRotateError,
    } = useChangePassword();
    return { rotatePassword, isRotateSuccess, isRotateError };
  });

describe("useChangePassword", () => {
  beforeEach(() => {
    server.use(http.post(CHANGE_URL, () => new HttpResponse(null, { status: 204 })));
  });

  it("toasts on success so the form can reset", async () => {
    const { result } = renderChangePassword();
    const onSuccess = vi.fn();

    act(() => {
      result.current.rotatePassword(changePayload, { onSuccess });
    });

    await waitFor(() => expect(result.current.isRotateSuccess).toBe(true));

    expect(showToast).toHaveBeenCalledWith("success", "Your password has been changed.");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("suppresses the default toast on a wrong current password", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Current password is incorrect." }, { status: 400 })
    );
    server.use(http.post(CHANGE_URL, failingRequest));

    const { result } = renderChangePassword();
    const onError = vi.fn();

    act(() => {
      result.current.rotatePassword(changePayload, { onError });
    });

    await waitFor(() => expect(result.current.isRotateError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: rotatePassword } = useChangePassword();
      const { mutate: updatePassword } = useResetPassword();
      return { rotatePassword, updatePassword };
    });

    expect(result.current.rotatePassword).toBeTypeOf("function");
    expect(result.current.updatePassword).toBeTypeOf("function");
  });
});
