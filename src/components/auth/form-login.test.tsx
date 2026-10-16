import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormLogin } from "@/components/auth/form-login";
import { useAuthStore } from "@/stores/auth";
import { buildAuthenticatedUser } from "@/test/factories";
import { routerPush } from "@/test/__mocks__/next/navigation";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render-query-hook";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("@/helpers/toast");

const LOGIN_URL = new URL("/api/auth/login", process.env.NEXT_PUBLIC_API_BASE_URL).toString();

const initialAuthState = useAuthStore.getState();

const renderFormLogin = () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...render(<FormLogin />, { wrapper }), queryClient };
};

const emailInput = () => screen.getByPlaceholderText("you@example.com");
const passwordInput = () => screen.getByPlaceholderText("••••••••");
const signInButton = () => screen.getByRole("button", { name: "Sign in" });

describe("FormLogin", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    server.use(
      http.post(LOGIN_URL, () => HttpResponse.json({ user: buildAuthenticatedUser() }))
    );
  });

  it("renders the email, password and submit controls", () => {
    renderFormLogin();

    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(signInButton()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("shows zod validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderFormLogin();

    await user.click(signInButton());

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeInTheDocument();
    expect(await screen.findByText("Password is required")).toBeInTheDocument();
  });

  it("signs in with valid credentials and navigates", async () => {
    const user = userEvent.setup();
    renderFormLogin();

    await user.type(emailInput(), "seller@apcs.test");
    await user.type(passwordInput(), "Valid1234");
    await user.click(signInButton());

    await waitFor(() =>
      expect(useAuthStore.getState().user).toMatchObject({ email: "seller@apcs.test" })
    );
    expect(routerPush).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the inline message on invalid credentials", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({ message: "Invalid credentials." }, { status: 401 })
      )
    );
    const user = userEvent.setup();
    renderFormLogin();

    await user.type(emailInput(), "seller@apcs.test");
    await user.type(passwordInput(), "Wrong1234");
    await user.click(signInButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect."
    );
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("switches to the two-factor challenge when required", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          requiresTwoFactor: true,
          tempToken: "temp-1",
          twoFactorExpiresAtUtc: new Date(Date.now() + 300000).toISOString(),
        })
      )
    );
    const user = userEvent.setup();
    renderFormLogin();

    await user.type(emailInput(), "admin@apcs.test");
    await user.type(passwordInput(), "Valid1234");
    await user.click(signInButton());

    expect(await screen.findByText("Verify your administrator account")).toBeInTheDocument();
    expect(screen.getByLabelText("Email verification code")).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
