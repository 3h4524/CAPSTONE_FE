"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { FormResendVerification } from "@/components/auth/form-resend-verification";
import { getErrorMessage } from "@/helpers/error-message";
import { useVerifyEmail } from "@/hooks/mutations/use-verify-email";

export const VerifyEmailStatus = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: verifyEmail, isPending, isSuccess, isError, error } = useVerifyEmail();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!token || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    verifyEmail(token);
  }, [token, verifyEmail]);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          This link is missing its verification token. Enter your email to get a new one.
        </p>
        <FormResendVerification />
      </div>
    );
  }

  if (isPending) {
    return <p className="text-sm text-gray-600">Verifying your email...</p>;
  }

  if (isSuccess) {
    return <p className="text-sm text-green-700">Your email is verified. You can sign in now.</p>;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {getErrorMessage(error, "This verification link is invalid or expired.")}
        </p>
        <FormResendVerification />
      </div>
    );
  }

  return null;
};
