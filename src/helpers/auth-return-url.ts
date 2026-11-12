import type { AuthenticatedUser } from "@/types/auth";

const ADMIN_ROLE = "admin";

export const isSafeInternalPath = (value?: string | null): value is string =>
  Boolean(value) &&
  (value as string).startsWith("/") &&
  !(value as string).startsWith("//") &&
  !(value as string).includes("\\");

export const getReturnUrlParam = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("returnUrl");
};

export const getSafeReturnUrl = (): string => {
  const value = getReturnUrlParam();
  return isSafeInternalPath(value) ? value : "/dashboard";
};

export const resolveSignedInLanding = (
  user: AuthenticatedUser,
  returnUrl?: string | null
): string => {
  if (isSafeInternalPath(returnUrl)) {
    return returnUrl;
  }

  const isAdmin = user.roles.some((role) => role.trim().toLowerCase() === ADMIN_ROLE);
  return isAdmin ? "/admin/dashboard" : "/dashboard";
};
