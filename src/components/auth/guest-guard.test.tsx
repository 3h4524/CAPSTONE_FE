import { beforeEach, describe, expect, it } from "vitest";

import { GuestGuard } from "@/components/auth/guest-guard";
import { useAuthStore } from "@/stores/auth";
import { routerReplace } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { render, screen, waitFor } from "@testing-library/react";

const initialAuthState = useAuthStore.getState();

const renderGuard = (returnUrl?: string) =>
  render(
    <GuestGuard returnUrl={returnUrl}>
      <div>guest content</div>
    </GuestGuard>
  );

describe("GuestGuard", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
  });

  it("shows the checking state while hydration is pending", () => {
    const { queryByText: queryContent } = renderGuard();

    expect(screen.getByRole("status", { name: "Checking sign-in" })).toBeInTheDocument();
    expect(queryContent("guest content")).not.toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("renders children for signed-out visitors", () => {
    useAuthStore.getState().markHydrated();

    const { getByText: getContent } = renderGuard();

    expect(getContent("guest content")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("redirects a signed-in seller to the dashboard", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Seller"] }));
    useAuthStore.getState().markHydrated();

    const { queryByText: queryContent } = renderGuard();

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/dashboard"));
    expect(queryContent("guest content")).not.toBeInTheDocument();
  });

  it("redirects a signed-in admin to the admin dashboard", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Admin"] }));
    useAuthStore.getState().markHydrated();

    renderGuard();

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("honors a safe return url for signed-in users", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().markHydrated();

    renderGuard("/workflows?tab=runs");

    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith("/workflows?tab=runs")
    );
  });

  it("ignores an unsafe return url for signed-in users", async () => {
    useAuthStore.getState().setUser(buildAuthenticatedUser());
    useAuthStore.getState().markHydrated();

    renderGuard("/\\evil.test");

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/dashboard"));
  });
});
