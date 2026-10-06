"use client";

import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WorkflowActionsMenuProps = {
  disabled: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export const WorkflowActionsMenu = ({ disabled, onRename, onDuplicate, onDelete }: WorkflowActionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="More workflow actions" disabled={disabled}>
        <MoreHorizontal aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem onSelect={onRename} className="gap-2">
        <Pencil className="size-4" aria-hidden="true" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onDuplicate} className="gap-2">
        <Copy className="size-4" aria-hidden="true" />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive gap-2">
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
