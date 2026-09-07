import type { ComponentProps } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { FormErrorText } from "./form-error-text";

type FormInputFieldProps = {
  id: string;
  label: string;
  type: ComponentProps<typeof Input>["type"];
  placeholder: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
  draft?: boolean;
  className?: string;
};

export const FormInputField = ({
  id,
  label,
  type,
  placeholder,
  registration,
  error,
  autoComplete,
  required,
  hint,
  maxLength,
  draft,
  className,
}: FormInputFieldProps) => {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FormLabel htmlFor={id} required={required}>
          {label}
        </FormLabel>
        {draft && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
            Draft
          </Badge>
        )}
      </div>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={className}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
      />
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      <FormErrorText id={errorId} message={error?.message} />
    </div>
  );
};
