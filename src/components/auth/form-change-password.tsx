"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useChangePassword } from "@/hooks/mutations/use-change-password";
import { type ChangePasswordFormValues, changePasswordSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormChangePassword = () => {
  const { t } = useTranslation("common");
  // isHydrated flips to true only after the app-mount silent refresh resolves, so this waits
  // instead of flashing "not signed in" while that check is still in flight.
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isSignedIn = useAuthStore((state) => Boolean(state.user));
  const { mutate: changePassword, isPending, isError, error } = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  if (!isHydrated) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <p className="text-ink-600 text-sm">{t("auth.changePassword.signInRequired")}</p>
        <Link href="/login" className="text-primary text-sm font-medium hover:underline">
          {t("auth.changePassword.goToLogin")}
        </Link>
      </div>
    );
  }

  const onSubmit = (values: ChangePasswordFormValues) => {
    changePassword(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInputField
        id="currentPassword"
        label={t("auth.changePassword.currentPassword")}
        type="password"
        placeholder="••••••••"
        registration={register("currentPassword")}
        error={errors.currentPassword}
        autoComplete="current-password"
        showToggle
        required
      />

      <FormInputField
        id="newPassword"
        label={t("auth.changePassword.newPassword")}
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
        id="confirmNewPassword"
        label={t("auth.changePassword.confirmNewPassword")}
        type="password"
        placeholder="••••••••"
        registration={register("confirmNewPassword")}
        error={errors.confirmNewPassword}
        autoComplete="new-password"
        showToggle
        required
      />

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {getErrorMessage(error, t("auth.changePassword.failed"))}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
        {isPending ? t("auth.updating") : t("auth.changePassword.submit")}
      </Button>
    </form>
  );
};
