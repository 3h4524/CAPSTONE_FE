"use client";

import Image from "next/image";

import { Checkbox } from "@/components/ui/checkbox";
import { previewFallbackFor } from "@/helpers/style-preset";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateCardProps = {
  template: MockupTemplate;
  selected: boolean;
  onToggle: (id: string) => void;
};

export const MockupTemplateCard = ({ template, selected, onToggle }: MockupTemplateCardProps) => (
  <label
    className={cn(
      "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors",
      selected ? "border-primary ring-primary/20 ring-2" : "border-slate-200 hover:border-slate-300"
    )}
  >
    <Checkbox checked={selected} onCheckedChange={() => onToggle(template.id)} aria-label={template.name} className="mt-1" />
    {template.previewImageUrl ? (
      <Image src={template.previewImageUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-lg object-cover" />
    ) : (
      <span
        aria-hidden="true"
        className={cn("size-14 shrink-0 rounded-lg bg-gradient-to-br", previewFallbackFor(template.id))}
      />
    )}
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-slate-900">{template.name}</span>
      <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">{template.productType}</span>
    </span>
  </label>
);
