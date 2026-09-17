import { cookies } from "next/headers";

import type { AuthenticatedUser } from "@/types/auth";

const ADMIN_ROLE = "Admin";

export const getSessionUser = async (): Promise<AuthenticatedUser | null> => {
  try {
    const cookieStore = await cookies();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthenticatedUser;
  } catch {
    return null;
  }
};

export const resolveSignedInLanding = (
  user: AuthenticatedUser,
  returnUrl?: string
): string => {
  if (returnUrl?.startsWith("/") && !returnUrl.startsWith("//")) {
    return returnUrl;
  }

  const isAdmin = user.roles.some((role) => role.toLowerCase() === ADMIN_ROLE.toLowerCase());
  return isAdmin ? "/admin/dashboard" : "/dashboard";
};
