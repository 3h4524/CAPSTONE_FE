"use client";

import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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

export const WorkflowActionsMenu = ({
  disabled,
  onRename,
  onDuplicate,
  onDelete,
}: WorkflowActionsMenuProps) => {
  const { t } = useTranslation("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("workflowEditor.toolbar.moreActions")}
          disabled={disabled}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onRename} className="gap-2">
          <Pencil className="size-4" aria-hidden="true" />
          {t("workflowEditor.toolbar.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate} className="gap-2">
          <Copy className="size-4" aria-hidden="true" />
          {t("workflowEditor.toolbar.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive gap-2"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t("workflowEditor.toolbar.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
