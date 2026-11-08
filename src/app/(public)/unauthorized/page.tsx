import type { Metadata } from "next";

import { getSessionUser, resolveSignedInLanding } from "@/api/session";
import { UnauthorizedPage } from "@/components/auth/unauthorized-page";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Access denied",
  description: "You do not have permission to access this page.",
  pathname: "/unauthorized",
  robots: { index: false, follow: false },
});

const UnauthorizedRoute = async () => {
  const user = await getSessionUser();

  return <UnauthorizedPage dashboardHref={user ? resolveSignedInLanding(user) : "/dashboard"} />;
};

export default UnauthorizedRoute;
