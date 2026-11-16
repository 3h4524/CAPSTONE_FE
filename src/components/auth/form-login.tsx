"use client";

import { type FormEvent,useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { AuthSocialDivider } from "@/components/auth/auth-social-divider";
import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/helpers/error-message";
import { useAdminTwoFactor } from "@/hooks/mutations/use-admin-two-factor";
import { useLogin } from "@/hooks/mutations/use-login";
import { useResendAdminTwoFactor } from "@/hooks/mutations/use-resend-admin-two-factor";
import { type LoginFormValues, loginSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

export const FormLogin = () => {
  const { t } = useTranslation("common");
  const { mutate: login, isPending, isError, error } = useLogin();
  const { mutate: verifyTwoFactor, isPending: isVerifying } = useAdminTwoFactor();
  const { mutate: resendTwoFactor, isPending: isResending } = useResendAdminTwoFactor();
  const [challenge, setChallenge] = useState<{
    tempToken: string;
    expiresAtUtc: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);

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

  useEffect(() => {
    if (!challenge) {
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(challenge.expiresAtUtc) - Date.now()) / 1000)
      );
      setSecondsRemaining(remaining);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [challenge]);

  const onSubmit = (values: LoginFormValues) =>
    login(values, {
      onSuccess: (result) => {
        if (result.requiresTwoFactor && result.tempToken && result.twoFactorExpiresAtUtc) {
          setChallenge({
            tempToken: result.tempToken,
            expiresAtUtc: result.twoFactorExpiresAtUtc,
          });
          setOtpCode("");
        }
      },
    });

  const onVerifyOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge || otpCode.length !== 6 || secondsRemaining === 0) {
      return;
    }

    verifyTwoFactor({ tempToken: challenge.tempToken, otpCode });
  };

  const onResendOtp = () => {
    if (!challenge) {
      return;
    }

    resendTwoFactor(challenge.tempToken, {
      onSuccess: (result) => {
        setChallenge(result);
        setOtpCode("");
      },
    });
  };

  const loginErrorMessage = axios.isAxiosError(error)
    ? error.response?.status === 401 || error.response?.status === 404
      ? t("auth.login.invalidCredentials")
      : getErrorMessage(error, t("auth.login.failed"))
    : getErrorMessage(error, t("auth.login.failed"));

  if (challenge) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("auth.twoFactor.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("auth.twoFactor.description")}
          </p>
        </div>

        <form onSubmit={onVerifyOtp} className="space-y-4">
          <label htmlFor="admin-otp" className="text-sm font-medium">
            {t("auth.twoFactor.codeLabel")}
          </label>
          <input
            id="admin-otp"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-center text-lg tracking-[0.35em]"
            disabled={isVerifying || secondsRemaining === 0}
            autoFocus
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isVerifying || otpCode.length !== 6 || secondsRemaining === 0}
          >
            {isVerifying ? t("auth.twoFactor.verifying") : t("auth.twoFactor.submit")}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {secondsRemaining > 0
              ? t("auth.twoFactor.expiresIn", {
                  time: `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`,
                })
              : t("auth.twoFactor.expired")}
          </span>
          <button
            type="button"
            className="text-primary font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onResendOtp}
            disabled={isResending}
          >
            {isResending ? t("auth.sending") : t("auth.twoFactor.resend")}
          </button>
        </div>
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
          autoComplete="current-password"
          required
        />

        {isError ? (
          <p role="alert" className="text-destructive text-sm" aria-live="polite">
            {loginErrorMessage}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
          {t("auth.login.submit")}
        </Button>
      </form>

      <AuthSocialDivider
        mode="signin"
        onTwoFactorRequired={(tempToken, expiresAtUtc) => {
          setChallenge({ tempToken, expiresAtUtc });
          setOtpCode("");
        }}
      />

      <p className="text-muted-foreground text-center text-sm">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          {t("auth.login.signUp")}
        </Link>
      </p>
    </div>
  );
};
