"use client";

import { type ComponentProps,useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

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
  /** Adds a show/hide toggle over a password field instead of a fixed masked input. */
  showToggle?: boolean;
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
  showToggle = false,
}: FormInputFieldProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  const resolvedType = showToggle ? (isRevealed ? "text" : "password") : type;

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
      <div className="relative">
        <Input
          id={id}
          type={resolvedType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={cn(showToggle && "pr-10", className)}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          {...registration}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setIsRevealed((previous) => !previous)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            aria-label={isRevealed ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      <FormErrorText id={errorId} message={error?.message} />
    </div>
  );
};
