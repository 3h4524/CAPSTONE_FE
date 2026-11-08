"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NodePaletteItem } from "@/components/workflows/palette/node-palette-item";
import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import { getAddableStepTypes, insertStep } from "@/helpers/workflow-steps";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeDefinition, WorkflowNodeType } from "@/types/workflow";

const ALL_STEP_TYPES = Object.keys(WORKFLOW_NODE_DEFINITIONS) as WorkflowNodeType[];

/** Adds a step to the phone's list. The run order decides where it goes, so there is nowhere to choose. */
export const AddStepSheet = () => {
  const [isOpen, setIsOpen] = useState(false);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const isLocked = useWorkflowStore((state) => state.isRunning || state.workflowId === null);
  const applyGraphPatch = useWorkflowStore((state) => state.applyGraphPatch);
  const selectNode = useWorkflowStore((state) => state.selectNode);
  const addable = getAddableStepTypes(ALL_STEP_TYPES, nodes);

  const addStep = (definition: WorkflowNodeDefinition) => {
    const { nodes: nextNodes, edges: nextEdges, step } = insertStep(definition.type, nodes, edges);
    applyGraphPatch(nextNodes, nextEdges);
    selectNode(step.id);
    setIsOpen(false);
  };

  if (addable.length === 0) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="w-full border-dashed" disabled={isLocked}>
          <Plus aria-hidden="true" />
          Add step
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80dvh] gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Add a step</SheetTitle>
          <SheetDescription>It goes to its place in the run and connects by itself.</SheetDescription>
        </SheetHeader>
        <div className="space-y-1 overflow-y-auto p-3">
          {addable.map((type) => (
            <NodePaletteItem key={type} definition={WORKFLOW_NODE_DEFINITIONS[type]} disabled={isLocked} onAdd={addStep} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
