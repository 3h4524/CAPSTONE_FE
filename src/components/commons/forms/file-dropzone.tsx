"use client";

import { useId, useState } from "react";
import { CheckCircle2, FileUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

type FileDropzoneProps = {
  label: string;
  accept: string;
  fileName?: string;
  invalid?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onBlur?: () => void;
};

export const FileDropzone = ({ label, accept, fileName, invalid = false, disabled = false, onSelect, onBlur }: FileDropzoneProps) => {
  const { t } = useTranslation("common");
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <label
        htmlFor={inputId}
        className={cn(
          "border-ink-300 bg-ink-50 hover:border-ink-400 flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
          invalid && "border-destructive",
          disabled && "pointer-events-none opacity-60"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onSelect(file);
        }}
      >
        {fileName ? (
          <>
            <CheckCircle2 className="size-5 text-emerald-500" aria-hidden="true" />
            <span className="text-ink-700 max-w-full truncate text-sm font-semibold">{fileName}</span>
            <span className="text-ink-600 text-xs">{t("fileDropzone.replace")}</span>
          </>
        ) : (
          <>
            <FileUp className="text-ink-500 size-5" aria-hidden="true" />
            <span className="text-ink-600 text-sm">{t("fileDropzone.prompt")}</span>
          </>
        )}
        <input
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-invalid={invalid}
          className="sr-only"
          onBlur={onBlur}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onSelect(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
};
