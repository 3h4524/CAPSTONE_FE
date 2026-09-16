import type { Metadata } from "next";

import { FormChangePassword } from "@/components/auth/form-change-password";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Change password",
    description: SITE_CONFIG.description,
    pathname: "/change-password",
  });

const ChangePasswordPage = () => {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Change password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your current password and choose a new one.
        </p>
      </div>
      <FormChangePassword />
    </main>
  );
};

export default ChangePasswordPage;
