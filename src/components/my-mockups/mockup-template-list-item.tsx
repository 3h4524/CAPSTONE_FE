"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateListItemProps = {
  template: MockupTemplate;
  busy?: boolean;
  onEdit: (template: MockupTemplate) => void;
  onDelete: (template: MockupTemplate) => void;
};

export const MockupTemplateListItem = ({ template, busy = false, onEdit, onDelete }: MockupTemplateListItemProps) => (
  <Card className="overflow-hidden">
    {template.previewImageUrl ? (
      <Image
        src={template.previewImageUrl}
        alt={template.name}
        width={640}
        height={360}
        unoptimized
        className="aspect-video w-full object-cover"
      />
    ) : (
      <span aria-hidden="true" className={cn("block aspect-video w-full bg-gradient-to-br from-slate-200 via-slate-100 to-zinc-200")} />
    )}
    <CardContent className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{template.name}</p>
        <Badge variant={template.isSystemTemplate ? "secondary" : "default"}>
          {template.isSystemTemplate ? "System" : "Mine"}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{template.productType} · {template.outputWidthPx} x {template.outputHeightPx}</p>
      {template.isMine && (
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onEdit(template)}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(template)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);
