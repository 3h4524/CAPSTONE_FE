import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { FormRegister } from "@/components/auth/form-register";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Create account",
    description: SITE_CONFIG.description,
    pathname: "/register",
  });

const RegisterPage = () => {
  return (
    <AuthSplitLayout
      title="Start your POD empire."
      description="Join us to start your creative journey."
      imageSrc="/images/landing/auth.jpg"
      imageAlt="Designer reviewing AI-generated product designs next to a laptop and printed t-shirts"
    >
      <FormRegister />
    </AuthSplitLayout>
  );
};

export default RegisterPage;
