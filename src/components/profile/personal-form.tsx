"use no memo";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { FormTextareaField } from "@/components/commons/forms/form-textarea-field";
import type { ProfileFormValues } from "@/schemas/profile";

type PersonalFormProps = {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
};

export const PersonalForm = ({ register, errors }: PersonalFormProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Personal information</h2>
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
        label="Business email"
        type="email"
        placeholder="you@example.com"
        registration={register("email")}
        error={errors.email}
        autoComplete="email"
        hint="Used for sign-in and account notices."
        maxLength={254}
        required
      />
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
    </section>
  );
};
