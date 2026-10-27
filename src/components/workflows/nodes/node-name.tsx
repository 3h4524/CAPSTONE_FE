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
      className="nodrag group/name focus-visible:ring-ring/40 flex min-w-0 flex-1 cursor-text items-center gap-1.5 rounded text-left outline-none focus-visible:ring-2 disabled:cursor-default"
    >
      <span
        className={cn(
          "border-wf-line bg-wf-surface grid size-5 shrink-0 place-items-center rounded-md border",
          iconClassName
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
      </span>
      <span className="min-w-0 truncate text-xs leading-5 font-semibold tracking-[-0.01em] text-slate-900">
        {label}
      </span>
      {!isRunning && (
        <Pencil
          className="text-wf-faint size-3 shrink-0 opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
};
