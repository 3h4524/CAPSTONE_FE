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
        className="nodrag h-6 min-w-0 flex-1 px-1.5 text-xs font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Rename node ${label}`}
      disabled={isRunning}
      onClick={startEditing}
      className="nodrag group/name flex max-w-full min-w-0 cursor-text items-center gap-1 rounded px-0.5 py-0.5 text-left hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent"
    >
      <Icon className={cn("size-3.5 shrink-0", iconClassName ?? "text-slate-500")} aria-hidden="true" />
      <span className="min-w-0 truncate text-xs font-semibold text-slate-700 group-hover/name:underline">
        {label}
      </span>
      {!isRunning && (
        <Pencil
          className="size-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/name:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
};
