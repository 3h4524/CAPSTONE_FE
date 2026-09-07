import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailStatus } from "@/components/auth/verify-email-status";
import { SITE_CONFIG } from "@/constants/site";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Verify email",
    description: SITE_CONFIG.description,
    pathname: "/verify-email",
  });

const VerifyEmailPage = () => {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Verify your email</h1>
      <Suspense fallback={<p className="text-sm text-gray-600">Loading...</p>}>
        <VerifyEmailStatus />
      </Suspense>
    </main>
  );
};

export default VerifyEmailPage;
