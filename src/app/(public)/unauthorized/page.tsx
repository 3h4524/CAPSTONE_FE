import type { Metadata } from "next";

import { getSessionUser } from "@/api/session";
import { UnauthorizedPage } from "@/components/auth/unauthorized-page";
import { getPageMetadata } from "@/data/metadata";
import { resolveSignedInLanding } from "@/helpers/auth-return-url";

export const metadata: Metadata = getPageMetadata({
  title: "Access denied",
  description: "You do not have permission to access this page.",
  pathname: "/unauthorized",
  robots: { index: false, follow: false },
});

const UnauthorizedRoute = async () => {
  const user = await getSessionUser();

  return user ? (
    <UnauthorizedPage actionHref={resolveSignedInLanding(user)} actionLabelKey="errors.goToDashboard" />
  ) : (
    <UnauthorizedPage actionHref="/login" actionLabelKey="errors.goToSignIn" />
  );
};

export default UnauthorizedRoute;
