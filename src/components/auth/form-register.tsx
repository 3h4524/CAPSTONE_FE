"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { FormResendVerification } from "@/components/auth/form-resend-verification";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/hooks/mutations/use-register";
import { type RegisterFormValues, registerSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormRegister = () => {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const { mutate: registerAccount, isPending } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    registerAccount(
      { email: values.email, password: values.password, fullName: values.fullName || undefined },
      { onSuccess: (result) => setRegisteredEmail(result.email) }
    );
  };

  if (registeredEmail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          We sent a verification link to <span className="font-medium">{registeredEmail}</span>.
          Open it to activate your account.
        </p>
        <FormResendVerification defaultEmail={registeredEmail} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="fullName"
          label="Full name"
          type="text"
          placeholder="Jane Doe"
          registration={register("fullName")}
          error={errors.fullName}
          autoComplete="name"
        />

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
          autoComplete="new-password"
          hint="At least 8 characters, with uppercase, lowercase, and a digit."
          required
        />

        <FormInputField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          registration={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
};
