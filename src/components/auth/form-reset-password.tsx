"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useResetPassword } from "@/hooks/mutations/use-reset-password";
import { type ResetPasswordFormValues, resetPasswordSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormResetPassword = () => {
  const { t } = useTranslation("common");
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
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("auth.resetPassword.missingToken")}
        </p>
        <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
          {t("auth.requestNewLink")}
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
          label={t("auth.resetPassword.newPassword")}
          type="password"
          placeholder="••••••••"
          registration={register("newPassword")}
          error={errors.newPassword}
          autoComplete="new-password"
          hint={t("auth.passwordHint")}
          showToggle
          required
        />

        <FormInputField
          id="confirmPassword"
          label={t("auth.resetPassword.confirmPassword")}
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
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {getErrorMessage(error, t("auth.resetPassword.invalidLink"))}
            </p>
            <Link href="/forgot-password" className="text-primary text-sm font-medium hover:underline">
              {t("auth.requestNewLink")}
            </Link>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? t("auth.updating") : t("auth.resetPassword.submit")}
        </Button>
      </form>

      <Link
        href="/login"
        className="text-primary flex items-center justify-center gap-1 text-sm font-medium hover:underline"
      >
        {t("auth.backToLoginLower")}
      </Link>
    </div>
  );
};
