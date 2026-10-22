import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthStore } from "@/stores/auth";
import { routerReplace, usePathname } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { render, screen, waitFor } from "@testing-library/react";

const initialAuthState = useAuthStore.getState();

const renderGuard = (requireSeller = false) =>
  render(<AuthGuard requireSeller={requireSeller}>{"protected content"}</AuthGuard>);

describe("AuthGuard", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    vi.mocked(usePathname).mockReturnValue("/dashboard");
  });

  it("shows the checking state while hydration is pending", () => {
    const { queryByText: queryContent } = renderGuard();

    expect(screen.getByRole("status", { name: "Checking sign-in" })).toBeInTheDocument();
    expect(queryContent("protected content")).not.toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("redirects signed-out visitors to login with the return url", async () => {
    useAuthStore.getState().markHydrated();

    const { queryByText: queryContent } = renderGuard();

    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith("/login?returnUrl=%2Fdashboard")
    );
    expect(queryContent("protected content")).not.toBeInTheDocument();
  });

  it("renders children for a signed-in user", () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().markHydrated();

    const { getByText: getContent } = renderGuard();

    expect(getContent("protected content")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("redirects a non-seller when the seller role is required", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Buyer"] }));
    useAuthStore.getState().markHydrated();

    const { queryByText: queryContent } = renderGuard(true);

    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith("/login?returnUrl=%2Fdashboard")
    );
    expect(queryContent("protected content")).not.toBeInTheDocument();
  });

  it("renders children for a seller when the seller role is required", () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Seller"] }));
    useAuthStore.getState().markHydrated();

    const { getByText: getContent } = renderGuard(true);

    expect(getContent("protected content")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
