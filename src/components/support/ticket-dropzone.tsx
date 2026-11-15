"use client";

import { useId, useState } from "react";
import { FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SUPPORT_FILE_RULES } from "@/constants/support";
import { cn } from "@/utils/cn";

type TicketDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function TicketDropzone({ files, onChange, disabled }: TicketDropzoneProps) {
  const { t } = useTranslation("common");
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming];
    if (next.length > SUPPORT_FILE_RULES.maximumCount) {
      setError(t("support.attachMaxCount", { count: SUPPORT_FILE_RULES.maximumCount }));
      return;
    }
    if (incoming.some((file) => file.size > SUPPORT_FILE_RULES.maximumFileBytes)) {
      setError(t("support.attachEachMax"));
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > SUPPORT_FILE_RULES.maximumTotalBytes) {
      setError(t("support.attachTotalMax"));
      return;
    }
    if (
      incoming.some(
        (file) => !SUPPORT_FILE_RULES.extensions.some((extension) => file.name.toLowerCase().endsWith(extension))
      )
    ) {
      setError(t("support.attachAllowedTypes"));
      return;
    }

    setError(null);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "focus-within:border-ring focus-within:ring-ring/15 border-ink-300 bg-ink-50 hover:border-ink-400 hover:bg-ink-100 flex min-h-20 items-center justify-center rounded-xl border border-dashed px-4 py-4 text-center transition-[border-color,background-color,box-shadow] focus-within:ring-3",
          disabled && "pointer-events-none opacity-60"
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <div className="text-ink-600 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span>{t("support.dragFilesHere")}</span>
          <label htmlFor={inputId} className="text-primary cursor-pointer font-medium underline underline-offset-2">
            {t("support.browse")}
          </label>
          <input
            id={inputId}
            type="file"
            multiple
            disabled={disabled}
            accept={SUPPORT_FILE_RULES.extensions.join(",")}
            className="sr-only"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      </div>
      <p className="text-ink-500 text-[11px]">{t("support.acceptedFiles")}</p>
      {error ? <p role="alert" className="text-destructive text-xs">{error}</p> : null}
      {files.length > 0 ? (
        <ul className="grid gap-2" aria-label={t("support.selectedAttachments")}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`} className="border-border bg-card flex items-center gap-3 rounded-lg border px-3 py-2">
              <FileText className="text-ink-500 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
              <span className="text-ink-500 text-xs">
                {formatBytes(file.size)} · {disabled ? t("support.uploadingStatus") : t("support.readyStatus")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={t("support.removeAttachment", { name: file.name })}
                onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
