import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FormRegister } from "@/components/auth/form-register";
import { server } from "@/test/mocks/server";
import { createTestQueryClient } from "@/test/render-query-hook";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/helpers/toast");

const REGISTER_URL = new URL(
  "/api/auth/register",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();
const RESEND_URL = new URL(
  "/api/auth/resend-verification",
  process.env.NEXT_PUBLIC_API_BASE_URL
).toString();

const renderFormRegister = () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<FormRegister />, { wrapper });
};

const fullNameInput = () => screen.getByPlaceholderText("Jane Doe");
const emailInput = () => screen.getByPlaceholderText("you@example.com");
const passwordInputs = () => screen.getAllByPlaceholderText("••••••••");
const createButton = () => screen.getByRole("button", { name: "Create account" });

describe("FormRegister", () => {
  beforeEach(() => {
    server.use(
      http.post(REGISTER_URL, () =>
        HttpResponse.json({
          userId: "user-1",
          email: "seller@apcs.test",
          requiresEmailVerification: true,
        })
      ),
      http.post(RESEND_URL, () => new HttpResponse(null, { status: 204 }))
    );
  });

  it("renders the registration fields and submit", () => {
    renderFormRegister();

    expect(fullNameInput()).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInputs()).toHaveLength(2);
    expect(createButton()).toBeInTheDocument();
  });

  it("shows zod validation errors on empty submit", async () => {
    const user = userEvent.setup();
    renderFormRegister();

    await user.click(createButton());

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeInTheDocument();
    expect(await screen.findByText("Please confirm your password")).toBeInTheDocument();
  });

  it("shows the verification confirmation after a successful registration", async () => {
    const user = userEvent.setup();
    renderFormRegister();

    await user.type(fullNameInput(), "Nhat Nguyen");
    await user.type(emailInput(), "seller@apcs.test");
    const [passwordInput, confirmInput] = passwordInputs();
    if (!passwordInput || !confirmInput) throw new Error("missing password inputs");
    await user.type(passwordInput, "Valid1234");
    await user.type(confirmInput, "Valid1234");
    await user.click(createButton());

    expect(await screen.findByText(/verification link to/)).toBeInTheDocument();
    expect(screen.getByText("seller@apcs.test")).toBeInTheDocument();
  });

  it("rejects mismatched confirmation without calling the api", async () => {
    const registerRequest = vi.fn(() =>
      HttpResponse.json({
        userId: "user-1",
        email: "seller@apcs.test",
        requiresEmailVerification: true,
      })
    );
    server.use(http.post(REGISTER_URL, registerRequest));
    const user = userEvent.setup();
    renderFormRegister();

    await user.type(emailInput(), "seller@apcs.test");
    const [passwordInput, confirmInput] = passwordInputs();
    if (!passwordInput || !confirmInput) throw new Error("missing password inputs");
    await user.type(passwordInput, "Valid1234");
    await user.type(confirmInput, "Different1");
    await user.click(createButton());

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    await waitFor(() => expect(registerRequest).not.toHaveBeenCalled());
  });
});
