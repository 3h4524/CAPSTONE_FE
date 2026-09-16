import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { FormLogin } from "@/components/auth/form-login";
import { SignedInRedirect } from "@/components/auth/signed-in-redirect";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Login",
    description: SITE_CONFIG.description,
    pathname: "/login",
  });

const LoginPage = () => {
  return (
    <AuthSplitLayout
      title="Welcome back."
      description="Log in to keep building your creative journey."
      imageSrc="/images/landing/auth.webp"
      imageAlt="Designer reviewing AI-generated product designs next to a laptop and printed t-shirts"
    >
      <FormLogin />
      <SignedInRedirect />
    </AuthSplitLayout>
  );
};

export default LoginPage;
