"use no memo";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

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
  const isAdmin = variant === "admin";

  return (
    <section className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <h2 className="text-sm font-semibold sm:col-span-2">Personal information</h2>
      <FormInputField
        id="fullName"
        label="Full name"
        type="text"
        placeholder="Your full name"
        registration={register("fullName")}
        error={errors.fullName}
        autoComplete="name"
        maxLength={100}
        required
      />
      <FormInputField
        id="email"
        label={isAdmin ? "Email" : "Business email"}
        type="email"
        placeholder="you@example.com"
        registration={register("email")}
        error={errors.email}
        autoComplete="email"
        hint="Used for sign-in and account notices."
        maxLength={254}
        required
      />
      {/* Admins run no shop, so the shop fields are seller-only. */}
      {!isAdmin && (
        <>
          <FormInputField
            id="shopName"
            label="Shop name"
            type="text"
            placeholder="Your shop name"
            registration={register("shopName")}
            error={errors.shopName}
            maxLength={100}
          />
          <FormTextareaField
            id="shopDescription"
            label="Shop description"
            placeholder="A short description of your shop"
            registration={register("shopDescription")}
            error={errors.shopDescription}
            rows={2}
          />
        </>
      )}
    </section>
  );
};
