"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StylePreset } from "@/types/style-presets";
import { cn } from "@/utils/cn";

type StylePresetListItemProps = {
  preset: StylePreset;
  onEdit: (preset: StylePreset) => void;
  onDelete: (preset: StylePreset) => void;
};

export const StylePresetListItem = ({ preset, onEdit, onDelete }: StylePresetListItemProps) => (
  <Card className="overflow-hidden">
    {preset.previewImageUrl ? (
      <Image
        src={preset.previewImageUrl}
        alt={preset.name}
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
        <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{preset.name}</p>
        <Badge variant={preset.isSystemTemplate ? "secondary" : "default"}>
          {preset.isSystemTemplate ? "System" : "Mine"}
        </Badge>
      </div>
      <p className="text-muted-foreground line-clamp-2 text-sm">{preset.description}</p>
      {preset.isMine && (
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(preset)}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(preset)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);
