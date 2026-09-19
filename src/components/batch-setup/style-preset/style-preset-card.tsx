"use client";

import Image from "next/image";

import { RadioGroupItem } from "@/components/ui/radio-group";
import { previewFallbackFor } from "@/helpers/style-preset";
import { cn } from "@/utils/cn";

type StylePresetCardProps = {
  value: string;
  name: string;
  description: string;
  previewImageUrl: string | null;
  selected: boolean;
};

export const StylePresetCard = ({ value, name, description, previewImageUrl, selected }: StylePresetCardProps) => (
  <label
    className={cn(
      "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors",
      selected ? "border-primary ring-primary/20 ring-2" : "border-slate-200 hover:border-slate-300"
    )}
  >
    <RadioGroupItem value={value} aria-label={name} className="mt-1" />
    {previewImageUrl ? (
      <Image src={previewImageUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-lg object-cover" />
    ) : (
      <span
        aria-hidden="true"
        className={cn("size-14 shrink-0 rounded-lg bg-gradient-to-br", previewFallbackFor(value))}
      />
    )}
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
      <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">{description}</span>
    </span>
  </label>
);
