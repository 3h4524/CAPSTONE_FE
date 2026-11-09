import { cookies } from "next/headers";

import type { AuthenticatedUser } from "@/types/auth";

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
