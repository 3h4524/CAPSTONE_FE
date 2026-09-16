import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { FormResetPassword } from "@/components/auth/form-reset-password";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Reset password",
    description: SITE_CONFIG.description,
    pathname: "/reset-password",
  });

const ResetPasswordPage = () => {
  return (
    <AuthSplitLayout
      title="Reset Password"
      description="Please enter your new password below."
      imageSrc="/images/landing/auth.jpg"
      imageAlt="Designer reviewing AI-generated product designs next to a laptop and printed t-shirts"
      imageCaption={{
        title: "Your creative studio, anywhere.",
        description:
          "Manage your designs, product mockups, and production pipeline in one professional workspace.",
      }}
    >
      <Suspense fallback={<p className="text-sm text-gray-600">Loading...</p>}>
        <FormResetPassword />
      </Suspense>
    </AuthSplitLayout>
  );
};

export default ResetPasswordPage;
