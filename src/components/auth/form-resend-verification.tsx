"use client";

import { useForm } from "react-hook-form";

import { FormInputField } from "@/components/commons/forms/form-input-field";
import { Button } from "@/components/ui/button";
import { useResendVerificationEmail } from "@/hooks/mutations/use-resend-verification-email";
import { type ResendVerificationFormValues, resendVerificationSchema } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";

type FormResendVerificationProps = {
  defaultEmail?: string;
};

export const FormResendVerification = ({ defaultEmail = "" }: FormResendVerificationProps) => {
  const { mutate: resendVerificationEmail, isPending } = useResendVerificationEmail();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationFormValues>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: {
      email: defaultEmail,
    },
  });

  const onSubmit = (values: ResendVerificationFormValues) => resendVerificationEmail(values.email);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormInputField
        id="resend-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        registration={register("email")}
        error={errors.email}
        autoComplete="email"
        required
      />

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={isSubmitting || isPending}
      >
        {isPending ? "Sending..." : "Resend verification email"}
      </Button>
    </form>
  );
};
