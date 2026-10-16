"use client";

import { useCallback } from "react";

import { showToast } from "@/helpers/toast";
import { toWorkflowDefinition } from "@/helpers/workflow-graph";
import { useUpdateWorkflow } from "@/hooks/mutations/use-update-workflow";
import type { WorkflowMetaFormValues } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { SaveWorkflowInput } from "@/types/workflow";
import { useReactFlow } from "@xyflow/react";

type SaveWorkflowOptions = {
  onSaved?: () => void;
};

export const useWorkflowSave = () => {
  const { getViewport } = useReactFlow();
  const markSaved = useWorkflowStore((state) => state.markSaved);
  const { mutate: updateWorkflow, isPending: isSaving } = useUpdateWorkflow();

  const buildSaveInput = useCallback(
    (meta?: WorkflowMetaFormValues): SaveWorkflowInput => {
      const { name, description, nodes, edges, revision } = useWorkflowStore.getState();
      return {
        name: meta?.name ?? name,
        description: meta?.description ?? description,
        definition: toWorkflowDefinition(nodes, edges, getViewport()),
        expectedRevision: revision,
      };
    },
    [getViewport]
  );

  const saveWorkflow = useCallback(
    (meta?: WorkflowMetaFormValues, options?: SaveWorkflowOptions) => {
      const { workflowId, isRunning, isDirty } = useWorkflowStore.getState();
      if (!workflowId || isRunning) return;
      if (!meta && !isDirty) return;
      updateWorkflow(
        { id: workflowId, input: buildSaveInput(meta) },
        {
          onSuccess: (saved) => {
            markSaved(saved);
            options?.onSaved?.();
            showToast("success", `${saved.name} was saved.`);
          },
        }
      );
    },
    [buildSaveInput, markSaved, updateWorkflow]
  );

  return { saveWorkflow, buildSaveInput, isSaving };
};
