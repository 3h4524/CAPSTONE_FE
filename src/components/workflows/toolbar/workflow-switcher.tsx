"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkflowSummary } from "@/types/workflow";
import { cn } from "@/utils/cn";

type WorkflowSwitcherProps = {
  workflows: WorkflowSummary[];
  activeWorkflowId: string | null;
  name: string;
  isDirty: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

export const WorkflowSwitcher = ({
  workflows,
  activeWorkflowId,
  name,
  isDirty,
  disabled,
  onSelect,
  onCreate,
}: WorkflowSwitcherProps) => (
  <div className="flex min-w-0 items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="max-w-72 min-w-0 px-2" disabled={disabled}>
          <span className="truncate text-base font-semibold text-slate-900">{name || "Workflow"}</span>
          <ChevronsUpDown className="text-muted-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Your workflows</DropdownMenuLabel>
        {workflows.map((workflow) => (
          <DropdownMenuItem key={workflow.id} onSelect={() => onSelect(workflow.id)} className="gap-2">
            <Check
              className={cn("size-4", workflow.id === activeWorkflowId ? "opacity-100" : "opacity-0")}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{workflow.name}</span>
            <span className="text-muted-foreground text-xs">{workflow.nodeCount} {workflow.nodeCount === 1 ? "node" : "nodes"}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreate} className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New workflow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {isDirty && (
      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700" role="status">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
        Unsaved
      </span>
    )}
  </div>
);
