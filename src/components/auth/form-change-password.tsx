"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useChangePassword } from "@/hooks/mutations/use-change-password";
import { type ChangePasswordFormValues, changePasswordSchema } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormChangePassword = () => {
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
        <p className="text-sm text-gray-600">You need to sign in to change your password.</p>
        <Link href="/login" className="text-primary text-sm font-medium hover:underline">
          Go to login
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
        label="Current Password"
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
        id="confirmNewPassword"
        label="Confirm New Password"
        type="password"
        placeholder="••••••••"
        registration={register("confirmNewPassword")}
        error={errors.confirmNewPassword}
        autoComplete="new-password"
        showToggle
        required
      />

      {isError && (
        <p className="text-sm text-red-600" role="alert">
          {getErrorMessage(error, "Could not change your password.")}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
        {isPending ? "Updating..." : "Change Password"}
      </Button>
    </form>
  );
};
