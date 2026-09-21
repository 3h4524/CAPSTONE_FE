"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplateDetailProps = {
  template: MockupTemplate | null;
};

export const MockupTemplateDetail = ({ template }: MockupTemplateDetailProps) => {
  if (!template) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-xl bg-slate-50 p-5 text-sm">
        <p className="font-semibold text-slate-900">No template selected</p>
        <p className="text-muted-foreground">Tick a template on the left to see its details here.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-5" aria-live="polite">
        {template.previewImageUrl ? (
          <Image src={template.previewImageUrl} alt={template.name} width={640} height={360} unoptimized className="aspect-video w-full rounded-lg object-cover" />
        ) : (
          <span aria-hidden="true" className="block aspect-video w-full rounded-lg bg-gradient-to-br from-slate-200 via-slate-100 to-zinc-200" />
        )}
        <div>
          <p className="font-semibold text-slate-900">{template.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{template.productType}</Badge>
            <Badge variant="outline">{template.outputWidthPx} x {template.outputHeightPx}</Badge>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Print area</p>
          <code className="mt-2 block rounded-lg bg-white p-3 text-xs break-all text-slate-700 ring-1 ring-slate-200 ring-inset">
            {template.printAreaConfig}
          </code>
        </div>
      </div>
    </ScrollArea>
  );
};
