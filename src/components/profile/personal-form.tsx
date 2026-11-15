"use no memo";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import type { ProfileFormValues } from "@/schemas/profile";
import type { AccountVariant } from "@/types/profile";

type PersonalFormProps = {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  variant?: AccountVariant;
};

export const PersonalForm = ({ register, errors, variant = "seller" }: PersonalFormProps) => {
  const { t } = useTranslation("common");
  const isAdmin = variant === "admin";

  return (
    <section className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <h2 className="text-sm font-semibold sm:col-span-2">{t("profile.personal.heading")}</h2>
      <FormInputField
        id="fullName"
        label={t("profile.personal.fullName")}
        type="text"
        placeholder={t("profile.personal.fullNamePlaceholder")}
        registration={register("fullName")}
        error={errors.fullName}
        autoComplete="name"
        maxLength={100}
        required
      />
      <FormInputField
        id="email"
        label={isAdmin ? t("profile.personal.email") : t("profile.personal.businessEmail")}
        type="email"
        placeholder="you@example.com"
        registration={register("email")}
        error={errors.email}
        autoComplete="email"
        hint={t("profile.personal.emailHint")}
        maxLength={254}
        required
      />
      {/* Admins run no shop, so the shop fields are seller-only. */}
      {!isAdmin && (
        <>
          <FormInputField
            id="shopName"
            label={t("profile.personal.shopName")}
            type="text"
            placeholder={t("profile.personal.shopNamePlaceholder")}
            registration={register("shopName")}
            error={errors.shopName}
            maxLength={100}
          />
          <FormTextareaField
            id="shopDescription"
            label={t("profile.personal.shopDescription")}
            placeholder={t("profile.personal.shopDescriptionPlaceholder")}
            registration={register("shopDescription")}
            error={errors.shopDescription}
            rows={2}
          />
        </>
      )}
    </section>
  );
};
