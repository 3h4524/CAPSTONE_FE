"use client";

import Image from "next/image";

import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/utils/cn";

const PREVIEW_FALLBACKS = [
  "from-amber-200 via-orange-100 to-rose-200",
  "from-slate-200 via-slate-100 to-zinc-200",
  "from-sky-200 via-cyan-100 to-teal-100",
  "from-violet-200 via-purple-100 to-fuchsia-100",
  "from-emerald-200 via-green-100 to-lime-100",
  "from-indigo-200 via-blue-100 to-sky-100",
];

const fallbackFor = (id: string) => {
  const hash = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return PREVIEW_FALLBACKS[hash % PREVIEW_FALLBACKS.length];
};

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
        className={cn("size-14 shrink-0 rounded-lg bg-gradient-to-br", fallbackFor(value))}
      />
    )}
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
      <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">{description}</span>
    </span>
  </label>
);
