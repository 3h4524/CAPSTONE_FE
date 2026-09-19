"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/cn";

type StylePresetImageDropzoneProps = {
  previewUrl: string | null;
  error: string | null;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

export const StylePresetImageDropzone = ({ previewUrl, error, disabled = false, onSelect, onRemove }: StylePresetImageDropzoneProps) => {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Preview image</Label>
      <div className={cn("flex flex-col gap-3", previewUrl && "sm:flex-row sm:items-stretch")}>
        {previewUrl && (
          <div className="relative w-fit sm:w-1/2">
            <Image src={previewUrl} alt="Style preview" width={320} height={180} unoptimized className="aspect-video h-full w-full rounded-lg object-cover ring-1 ring-slate-200 ring-inset" />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Remove preview image"
              className="absolute top-1 right-1 size-7"
              disabled={disabled}
              onClick={onRemove}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        )}
        <label
          htmlFor={inputId}
          className={cn(
            "flex min-h-20 flex-1 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-slate-400",
            dragging && "border-primary bg-primary/5",
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
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
            <ImagePlus className="size-4" aria-hidden="true" />
            <span>{previewUrl ? "Drag another image here or browse" : "Drag an image here or browse"}</span>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              disabled={disabled}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onSelect(file);
                event.target.value = "";
              }}
            />
          </div>
        </label>
      </div>
      <p className="text-[11px] text-slate-500">Images up to 5 MB</p>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};
