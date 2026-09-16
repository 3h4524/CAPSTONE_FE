import { redirect } from "next/navigation";

import { getSessionUser, resolveSignedInLanding } from "@/api/session";

type GuestGuardProps = {
  returnUrl?: string;
};

export const GuestGuard = async ({ returnUrl }: GuestGuardProps) => {
  const user = await getSessionUser();

  if (user) {
    redirect(resolveSignedInLanding(user, returnUrl));
  }

  return null;
};
