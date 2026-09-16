import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { FormForgotPassword } from "@/components/auth/form-forgot-password";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Forgot password",
    description: SITE_CONFIG.description,
    pathname: "/forgot-password",
  });

const ForgotPasswordPage = () => {
  return (
    <AuthSplitLayout
      title="Forgot Password?"
      description="Don't worry, enter your email and we'll send you instructions to reset your password."
      imageSrc="/images/landing/auth.jpg"
      imageAlt="Designer reviewing AI-generated product designs next to a laptop and printed t-shirts"
      imageCaption={{
        title: "Your creative studio, anywhere.",
        description:
          "Manage your designs, product mockups, and production pipeline in one professional workspace.",
      }}
    >
      <FormForgotPassword />
    </AuthSplitLayout>
  );
};

export default ForgotPasswordPage;
