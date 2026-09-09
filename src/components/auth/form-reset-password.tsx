"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useResetPassword } from "@/hooks/mutations/use-reset-password";
import { type ResetPasswordFormValues, resetPasswordSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormResetPassword = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: resetPassword, isPending, isError, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          This link is missing its reset token. Request a new one to continue.
        </p>
        <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = (values: ResetPasswordFormValues) => {
    resetPassword({ token, newPassword: values.newPassword });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="••••••••"
          registration={register("newPassword")}
          error={errors.newPassword}
          autoComplete="new-password"
          hint="At least 8 characters, with uppercase, lowercase, and a digit."
          showToggle
          required
        />

        <FormInputField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          registration={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
          showToggle
          required
        />

        {isError && (
          <div className="space-y-1">
            <p className="text-sm text-red-600" role="alert">
              {getErrorMessage(error, "This link is invalid or expired.")}
            </p>
            <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
              Request a new link
            </Link>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? "Updating..." : "Update Password"}
        </Button>
      </form>

      <Link
        href="/login"
        className="text-primary flex items-center justify-center gap-1 text-sm font-medium hover:underline"
      >
        ← Back to login
      </Link>
    </div>
  );
};
