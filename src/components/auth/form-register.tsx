"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";

import { FormResendVerification } from "@/components/auth/form-resend-verification";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { useRegister } from "@/hooks/mutations/use-register";
import { type RegisterFormValues, registerSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormRegister = () => {
  const { t } = useTranslation("common");
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
        <p className="text-ink-600 text-sm">
          <Trans
            i18nKey="auth.register.verificationSent"
            values={{ email: registeredEmail }}
            components={{ email: <span className="font-medium" /> }}
          />
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
          label={t("auth.register.fullName")}
          type="text"
          placeholder={t("auth.register.fullNamePlaceholder")}
          registration={register("fullName")}
          error={errors.fullName}
          autoComplete="name"
        />

        <FormInputField
          id="email"
          label={t("auth.email")}
          type="email"
          placeholder="you@example.com"
          registration={register("email")}
          error={errors.email}
          autoComplete="email"
          required
        />

        <FormInputField
          id="password"
          label={t("auth.password")}
          type="password"
          placeholder="••••••••"
          registration={register("password")}
          error={errors.password}
          autoComplete="new-password"
          hint={t("auth.passwordHint")}
          required
        />

        <FormInputField
          id="confirmPassword"
          label={t("auth.register.confirmPassword")}
          type="password"
          placeholder="••••••••"
          registration={register("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {isPending ? t("auth.register.creating") : t("auth.register.submit")}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t("auth.register.hasAccount")}{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t("auth.register.logIn")}
        </Link>
      </p>
    </div>
  );
};
