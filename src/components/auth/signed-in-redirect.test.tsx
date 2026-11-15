import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignedInRedirect } from "@/components/auth/signed-in-redirect";
import { useAuthStore } from "@/stores/auth";
import { routerReplace, usePathname } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import { render, waitFor } from "@testing-library/react";

const initialAuthState = useAuthStore.getState();

describe("SignedInRedirect", () => {
  beforeEach(() => {
    useAuthStore.setState(initialAuthState, true);
    vi.mocked(usePathname).mockReturnValue("/");
  });

  it("does nothing for signed-out visitors", () => {
    useAuthStore.getState().markHydrated();

    render(<SignedInRedirect />);

    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("redirects a signed-in seller to the dashboard", async () => {
    vi.mocked(usePathname).mockReturnValue("/features");
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Seller"] }));

    render(<SignedInRedirect exemptPaths={["/login"]} />);

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/dashboard"));
  });

  it("redirects a signed-in admin to the admin dashboard", async () => {
    vi.mocked(usePathname).mockReturnValue("/features");
    useAuthStore.getState().setUser(buildAuthenticatedUser({ roles: ["Admin"] }));

    render(<SignedInRedirect />);

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("does not redirect on an exempt path", () => {
    vi.mocked(usePathname).mockReturnValue("/verify-email");
    useAuthStore.getState().setUser(buildAuthenticatedUser());

    render(<SignedInRedirect exemptPaths={["/verify-email"]} />);

    expect(routerReplace).not.toHaveBeenCalled();
  });
});
