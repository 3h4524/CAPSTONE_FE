"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/hooks/mutations/use-forgot-password";
import { type ForgotPasswordFormValues, forgotPasswordSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormForgotPassword = () => {
  const { t } = useTranslation("common");
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
        <p className="text-ink-600 text-sm">
          <Trans
            i18nKey="auth.forgotPassword.sent"
            values={{ email: submittedEmail }}
            components={{ email: <span className="font-medium" /> }}
          />
        </p>
        <Link
          href="/login"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="email"
          label={t("auth.email")}
          type="email"
          placeholder="enter@email.com"
          registration={register("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? t("auth.sending") : t("auth.forgotPassword.submit")}
          {!isPending && <ArrowRight aria-hidden="true" className="size-4" />}
        </Button>
      </form>

      <Link
        href="/login"
        className="text-primary flex items-center justify-center gap-1 text-sm font-medium hover:underline"
      >
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
};
