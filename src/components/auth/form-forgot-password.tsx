"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { type ForgotPasswordFormValues, forgotPasswordSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormForgotPassword = () => {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotPassword(values.email, {
      onSuccess: () => setSubmittedEmail(values.email),
    });
  };

  if (submittedEmail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          If an account exists for <span className="font-medium">{submittedEmail}</span>, we sent
          a link to reset your password. Open it to continue.
        </p>
        <Link
          href="/login"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          ← Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="email"
          label="Email"
          type="email"
          placeholder="enter@email.com"
          registration={register("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? "Sending..." : "Send Request"}
          {!isPending && <ArrowRight aria-hidden="true" className="size-4" />}
        </Button>
      </form>

      <Link
        href="/login"
        className="text-primary flex items-center justify-center gap-1 text-sm font-medium hover:underline"
      >
        ← Back to Login
      </Link>
    </div>
  );
};
