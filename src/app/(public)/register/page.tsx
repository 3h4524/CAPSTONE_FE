import type { Metadata } from "next";

import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { FormRegister } from "@/components/auth/form-register";
import { GuestGuard } from "@/components/auth/guest-guard";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Create account",
    description: SITE_CONFIG.description,
    pathname: "/register",
  });

type RegisterPageProps = {
  searchParams: Promise<{ returnUrl?: string }>;
};

const RegisterPage = async ({ searchParams }: RegisterPageProps) => {
  const { returnUrl } = await searchParams;

  return (
    <AuthSplitLayout
      title="Start your POD empire."
      description="Join us to start your creative journey."
      imageSrc="/images/landing/auth.webp"
      imageAlt="Designer reviewing AI-generated product designs next to a laptop and printed t-shirts"
    >
      <FormRegister />
      <GuestGuard returnUrl={returnUrl} />
    </AuthSplitLayout>
  );
};

export default RegisterPage;
