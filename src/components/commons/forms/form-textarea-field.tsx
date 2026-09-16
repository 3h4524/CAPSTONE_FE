"use client";

import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

import { FormErrorText } from "./form-error-text";

type FormTextareaFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  required?: boolean;
  rows?: number;
  draft?: boolean;
};

export const FormTextareaField = ({
  id,
  label,
  placeholder,
  registration,
  error,
  required,
  rows = 3,
  draft,
}: FormTextareaFieldProps) => {
  const errorId = `${id}-error`;

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
      <Textarea
        id={id}
        placeholder={placeholder}
        rows={rows}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        {...registration}
      />
      <FormErrorText id={errorId} message={error?.message} />
    </div>
  );
};
