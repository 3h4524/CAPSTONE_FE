import { beforeEach, describe, expect, it, vi } from "vitest";

import { GuestGuard } from "@/components/auth/guest-guard";
import { redirect } from "@/test/__mocks__/next/navigation";
import { buildAuthenticatedUser } from "@/test/factories";
import type { AuthenticatedUser } from "@/types/auth";

const { mockGetSessionUser, mockResolveLanding } = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockResolveLanding: vi.fn(
    (_user: AuthenticatedUser, returnUrl?: string): string => returnUrl ?? "/dashboard"
  ),
}));

vi.mock("@/api/session", () => ({
  getSessionUser: mockGetSessionUser,
  resolveSignedInLanding: mockResolveLanding,
}));

describe("GuestGuard", () => {
  beforeEach(() => {
    mockGetSessionUser.mockResolvedValue(null);
    mockResolveLanding.mockImplementation(
      (_user: AuthenticatedUser, returnUrl?: string): string => returnUrl ?? "/dashboard"
    );
  });

  it("returns null for anonymous visitors without redirecting", async () => {
    const guardResult = await GuestGuard({ returnUrl: "/dashboard" });

    expect(guardResult).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects signed-in users to the resolved landing", async () => {
    const signedInUser = buildAuthenticatedUser();
    mockGetSessionUser.mockResolvedValue(signedInUser);
    mockResolveLanding.mockReturnValue("/dashboard");

    await GuestGuard({ returnUrl: "/dashboard" });

    expect(mockResolveLanding).toHaveBeenCalledWith(signedInUser, "/dashboard");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("passes an absent return url through to the landing resolver", async () => {
    const signedInUser = buildAuthenticatedUser();
    mockGetSessionUser.mockResolvedValue(signedInUser);
    mockResolveLanding.mockReturnValue("/dashboard");

    await GuestGuard({});

    expect(mockResolveLanding).toHaveBeenCalledWith(signedInUser, undefined);
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
