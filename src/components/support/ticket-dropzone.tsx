"use client";

import { useId, useState } from "react";
import { FileText, X } from "lucide-react";

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
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming];
    if (next.length > SUPPORT_FILE_RULES.maximumCount) {
      setError(`Attach up to ${SUPPORT_FILE_RULES.maximumCount} files.`);
      return;
    }
    if (incoming.some((file) => file.size > SUPPORT_FILE_RULES.maximumFileBytes)) {
      setError("Each attachment must be 10 MB or smaller.");
      return;
    }
    if (next.reduce((total, file) => total + file.size, 0) > SUPPORT_FILE_RULES.maximumTotalBytes) {
      setError("Attachments can total up to 25 MB.");
      return;
    }
    if (
      incoming.some(
        (file) => !SUPPORT_FILE_RULES.extensions.some((extension) => file.name.toLowerCase().endsWith(extension))
      )
    ) {
      setError("Use JPG, PNG, WebP, PDF, TXT, or LOG files.");
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
          <span>Drag files here or</span>
          <label htmlFor={inputId} className="text-primary cursor-pointer font-medium underline underline-offset-2">
            browse
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
      <p className="text-ink-500 text-[11px]">Accepted: images, PDF, TXT, LOG — max 10 MB each</p>
      {error ? <p role="alert" className="text-destructive text-xs">{error}</p> : null}
      {files.length > 0 ? (
        <ul className="grid gap-2" aria-label="Selected attachments">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`} className="border-border bg-card flex items-center gap-3 rounded-lg border px-3 py-2">
              <FileText className="text-ink-500 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
              <span className="text-ink-500 text-xs">
                {formatBytes(file.size)} · {disabled ? "Uploading…" : "Ready"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={`Remove ${file.name}`}
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
