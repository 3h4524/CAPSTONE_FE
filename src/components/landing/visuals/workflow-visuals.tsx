import Image from "next/image";
import { Check, FileSpreadsheet, Printer, Store } from "lucide-react";
import type { ComponentType } from "react";

import { PREVIEW_DESIGNS, type WorkflowVisualId } from "@/data/landing-content";

const SHEET_ROWS = [
  ["Desert tee", "Outdoors", "desert, retro"],
  ["Campfire poster", "Camping", "camping, sun"],
  ["Garden tote", "Florals", "iris, garden"],
];

const UploadVisual = () => (
  <div className="flex h-full flex-col gap-2 p-3">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold">
      <FileSpreadsheet className="text-brand size-3.5" />
      products.xlsx
    </p>
    <div className="overflow-hidden rounded-md border text-[10px]">
      <div className="bg-muted text-muted-foreground grid grid-cols-3 gap-2 px-2 py-1 font-semibold uppercase">
        <span>Product</span>
        <span>Niche</span>
        <span>Keywords</span>
      </div>
      {SHEET_ROWS.map((row) => (
        <div key={row[0]} className="grid grid-cols-3 gap-2 border-t px-2 py-1">
          {row.map((cell) => (
            <span key={cell} className="truncate">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const GenerateVisual = () => (
  <div className="flex h-full flex-col justify-between gap-2 p-3">
    <div className="grid grid-cols-3 gap-2">
      {PREVIEW_DESIGNS.slice(0, 3).map((design) => (
        <div key={design.name} className="bg-print-surface relative aspect-4/3 overflow-hidden rounded-md border">
          <Image src={design.imageSrc} alt="" fill sizes="96px" className="object-cover" />
        </div>
      ))}
    </div>
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>Generating assets</span>
        <span>18 / 24</span>
      </div>
      <span className="bg-muted h-1.5 overflow-hidden rounded-full">
        <span className="bg-brand block h-full w-3/4 rounded-full" />
      </span>
    </div>
  </div>
);

const SEO_CHECKS = ["Keywords in title", "13 / 13 tags filled", "Description length"];

const SeoVisual = () => {
  const score = 92;
  // Ring of radius 26: circumference 2 × π × 26 ≈ 163.4, so 92 % of it is drawn.
  const circumference = 2 * Math.PI * 26;
  return (
    <div className="flex h-full items-center gap-3 p-3">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-brand"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{score}</span>
      </div>
      <ul className="flex list-none flex-col gap-1.5 p-0">
        {SEO_CHECKS.map((check) => (
          <li key={check} className="flex items-center gap-1.5 text-[11px]">
            <Check className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
};

const SendVisual = () => {
  const design = PREVIEW_DESIGNS[0];
  return (
    <div className="flex h-full flex-col justify-between gap-2 p-3">
      <div className="flex items-center gap-2.5 rounded-md border p-2">
        <div className="bg-print-surface relative size-10 shrink-0 overflow-hidden rounded">
          {design && <Image src={design.imageSrc} alt="" fill sizes="40px" className="object-contain p-0.5" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">Desert Horizon Vintage Tee</p>
          <p className="text-muted-foreground text-[10px]">Images + video attached</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
        <span className="bg-surface-strong text-surface-strong-foreground flex items-center justify-center gap-1 rounded-md py-1.5">
          <Store className="size-3" />
          Etsy draft
        </span>
        <span className="text-muted-foreground flex items-center justify-center gap-1 rounded-md border py-1.5">
          <Printer className="size-3" />
          Printify
        </span>
      </div>
    </div>
  );
};

export const WORKFLOW_VISUALS: Record<WorkflowVisualId, ComponentType> = {
  upload: UploadVisual,
  generate: GenerateVisual,
  seo: SeoVisual,
  send: SendVisual,
};
