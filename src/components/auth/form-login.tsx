"use client";

import Link from "next/link";
import axios from "axios";
import { useForm } from "react-hook-form";

import { AuthSocialDivider } from "@/components/auth/auth-social-divider";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useLogin } from "@/hooks/mutations/use-login";
import { type LoginFormValues, loginSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormLogin = () => {
  const { mutate: login, isPending, isError, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => login(values);
  const loginErrorMessage = axios.isAxiosError(error)
    ? error.response?.status === 401 || error.response?.status === 404
      ? "Email or password is incorrect."
      : getErrorMessage(error, "Unable to sign in. Please try again.")
    : getErrorMessage(error, "Unable to sign in. Please try again.");

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          registration={register("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <FormInputField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          registration={register("password")}
          error={errors.password}
          autoComplete="current-password"
          required
        />

        {isError ? (
          <p role="alert" className="text-destructive text-sm" aria-live="polite">
            {loginErrorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <AuthSocialDivider mode="signin" />

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};
