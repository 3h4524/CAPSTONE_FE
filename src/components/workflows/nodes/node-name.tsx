"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import { sanitizeNodeLabel } from "@/helpers/workflow-config";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

const MAX_NODE_LABEL_LENGTH = 60;

type NodeNameProps = {
  nodeId: string;
  label: string;
  fallbackLabel: string;
  Icon: LucideIcon;
  iconClassName?: string;
};

export const NodeName = ({ nodeId, label, fallbackLabel, Icon, iconClassName }: NodeNameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const renameNode = useWorkflowStore((state) => state.renameNode);
  const isRunning = useWorkflowStore((state) => state.isRunning);

  const startEditing = () => {
    setDraft(label);
    setIsEditing(true);
  };

  const commitEditing = () => {
    renameNode(nodeId, sanitizeNodeLabel(draft, fallbackLabel));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={draft}
        maxLength={MAX_NODE_LABEL_LENGTH}
        aria-label="Node name"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitEditing();
          if (event.key === "Escape") setIsEditing(false);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        className="nodrag h-7 min-w-0 flex-1 px-1.5 text-[13px] font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Rename node ${label}`}
      disabled={isRunning}
      onClick={startEditing}
      className="nodrag group/name focus-visible:ring-ring/40 flex min-w-0 flex-1 cursor-text items-center gap-2 rounded text-left outline-none focus-visible:ring-2 disabled:cursor-default"
    >
      <span
        className={cn(
          "bg-muted/55 grid size-7 shrink-0 place-items-center rounded-md",
          iconClassName
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-card-foreground min-w-0 truncate text-[13px] leading-5 font-semibold">
        {label}
      </span>
      {!isRunning && (
        <Pencil
          className="size-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
};
