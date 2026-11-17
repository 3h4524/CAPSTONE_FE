import { z } from "zod";

import { i18n } from "@/i18n/client";

const passwordSchema = z
  .string()
  .min(8, { error: () => i18n.t("auth.validation.passwordMin") })
  .max(128, { error: () => i18n.t("auth.validation.passwordMax") })
  .regex(/[A-Z]/, { error: () => i18n.t("auth.validation.passwordUppercase") })
  .regex(/[a-z]/, { error: () => i18n.t("auth.validation.passwordLowercase") })
  .regex(/[0-9]/, { error: () => i18n.t("auth.validation.passwordDigit") });

export const registerSchema = z
  .object({
    fullName: z.string().max(255, { error: () => i18n.t("auth.validation.fullNameTooLong") }).optional(),
    email: z.email({ error: () => i18n.t("auth.validation.emailInvalid") }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: () => i18n.t("auth.validation.confirmPasswordRequired") }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: i18n.t("auth.validation.passwordsMismatch"),
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const resendVerificationSchema = z.object({
  email: z.email({ error: () => i18n.t("auth.validation.emailInvalid") }),
});

export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>;

export const loginSchema = z.object({
  email: z.email({ error: () => i18n.t("auth.validation.emailInvalid") }),
  password: z.string().min(1, { error: () => i18n.t("auth.validation.passwordRequired") }),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: () => i18n.t("auth.validation.emailInvalid") }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: () => i18n.t("auth.validation.confirmPasswordRequired") }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: i18n.t("auth.validation.passwordsMismatch"),
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: () => i18n.t("auth.validation.currentPasswordRequired") }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, { error: () => i18n.t("auth.validation.confirmNewPasswordRequired") }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: i18n.t("auth.validation.passwordsMismatch"),
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
