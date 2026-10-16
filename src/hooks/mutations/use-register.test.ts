import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { showToast } from "@/helpers/toast";
import { useLogin } from "@/hooks/mutations/use-login";
import { useRegister } from "@/hooks/mutations/use-register";
import { server } from "@/test/mocks/server";
import { renderQueryHook } from "@/test/render-query-hook";
import { act, waitFor } from "@testing-library/react";

vi.mock("@/helpers/toast");

const REGISTER_URL = new URL(
  "/api/auth/register",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const registerPayload = {
  email: "seller@apcs.test",
  password: "Valid1234",
  fullName: "Nhat Nguyen",
};

const registerResult = {
  userId: "user-1",
  email: "seller@apcs.test",
  requiresEmailVerification: true,
};

const renderRegister = () =>
  renderQueryHook(() => {
    const {
      mutate: registerAccount,
      data: registerData,
      isSuccess: isRegisterSuccess,
      isError: isRegisterError,
    } = useRegister();
    return { registerAccount, registerData, isRegisterSuccess, isRegisterError };
  });

describe("useRegister", () => {
  beforeEach(() => {
    server.use(http.post(REGISTER_URL, () => HttpResponse.json(registerResult)));
  });

  it("returns the registration result on success", async () => {
    const { result } = renderRegister();

    act(() => {
      result.current.registerAccount(registerPayload);
    });

    await waitFor(() => expect(result.current.isRegisterSuccess).toBe(true));

    expect(result.current.registerData).toEqual(registerResult);
  });

  it("forwards call-site onSuccess with the new account email", async () => {
    const { result } = renderRegister();
    const onSuccess = vi.fn();

    act(() => {
      result.current.registerAccount(registerPayload, { onSuccess });
    });

    await waitFor(() => expect(result.current.isRegisterSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(
      registerResult,
      registerPayload,
      undefined,
      expect.anything()
    );
  });

  it("shows the server message when the email is already taken", async () => {
    const failingRequest = vi.fn(() =>
      HttpResponse.json({ message: "Email is already registered." }, { status: 409 })
    );
    server.use(http.post(REGISTER_URL, failingRequest));

    const { result } = renderRegister();

    act(() => {
      result.current.registerAccount(registerPayload);
    });

    await waitFor(() => expect(result.current.isRegisterError).toBe(true));

    expect(failingRequest).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("error", "Email is already registered.");
  });

  it("falls back to the axios message when the error has no payload message", async () => {
    server.use(http.post(REGISTER_URL, () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderRegister();

    act(() => {
      result.current.registerAccount(registerPayload);
    });

    await waitFor(() => expect(result.current.isRegisterError).toBe(true));

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0]?.[0]).toBe("error");
  });

  it("supports destructured alias when combined with a second auth hook", () => {
    const { result } = renderQueryHook(() => {
      const { mutate: registerAccount } = useRegister();
      const { mutate: login } = useLogin();
      return { registerAccount, login };
    });

    expect(result.current.registerAccount).toBeTypeOf("function");
    expect(result.current.login).toBeTypeOf("function");
  });
});
