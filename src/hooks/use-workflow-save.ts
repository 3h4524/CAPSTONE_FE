"use client";

import { useCallback } from "react";

import { sameConfig, withoutProductConfigs, withProductConfig } from "@/helpers/product-video-configs";
import { showWorkflowActionToast } from "@/helpers/toast";
import { toWorkflowDefinition } from "@/helpers/workflow-graph";
import { useUpdateRunGroupDesignConfig } from "@/hooks/mutations/use-run-group-actions";
import { useUpdateWorkflow } from "@/hooks/mutations/use-update-workflow";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import type { WorkflowMetaFormValues } from "@/schemas/workflow";
import { sharedGraphNodes, useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig } from "@/types/video-workflow";
import type { SaveWorkflowInput } from "@/types/workflow";
import { useReactFlow } from "@xyflow/react";

type SaveWorkflowOptions = {
  onSaved?: () => void;
};

export const useWorkflowSave = () => {
  const { getViewport } = useReactFlow();
  const markSaved = useWorkflowStore((state) => state.markSaved);
  const markDesignSaved = useWorkflowStore((state) => state.markDesignSaved);
  const setScopeSharedConfig = useWorkflowStore((state) => state.setScopeSharedConfig);
  const groupId = useRunGroupId();
  const { data: group } = useRunGroup(groupId);
  const { mutate: updateWorkflow, isPending: isSaving } = useUpdateWorkflow();
  const { mutate: storeProductConfig, isPending: isStoringProduct } = useUpdateRunGroupDesignConfig();

  const buildSaveInput = useCallback(
    (meta?: WorkflowMetaFormValues): SaveWorkflowInput => {
      const state = useWorkflowStore.getState();
      const { name, description, edges, revision } = state;
      return {
        name: meta?.name ?? name,
        description: meta?.description ?? description,
        // A design's own settings shown on Generate Video are stored for that design, never as the workflow's.
        definition: toWorkflowDefinition(sharedGraphNodes(state), edges, getViewport()),
        expectedRevision: revision,
      };
    },
    [getViewport]
  );

  const saveWorkflow = useCallback(
    (meta?: WorkflowMetaFormValues, options?: SaveWorkflowOptions) => {
      const state = useWorkflowStore.getState();
      const { workflowId, isDirty, designScope } = state;
      if (!workflowId) return;
      if (!meta && !isDirty) return;

      const writeWorkflow = (storedFor?: string, afterSaved?: () => void) =>
        updateWorkflow(
          { id: workflowId, input: buildSaveInput(meta) },
          {
            onSuccess: (saved) => {
              markSaved(saved);
              afterSaved?.();
              options?.onSaved?.();
              showWorkflowActionToast(
                "success",
                storedFor ? `${saved.name} was saved, with ${storedFor}'s own video settings.` : `${saved.name} was saved.`
              );
            },
          }
        );

      const scopedConfig = designScope && state.nodes.find((node) => node.id === designScope.nodeId)?.data.config;

      // Before a run, a product chosen on Generate Video keeps its settings in the workflow, beside the shared ones.
      // Settings that match the shared ones put the product back on them.
      if (designScope?.kind === "product") {
        if (!scopedConfig || sameConfig(scopedConfig, designScope.baseConfig)) {
          writeWorkflow();
          return;
        }
        const { sharedConfig, productId, label } = designScope;
        const follows = sameConfig(scopedConfig, withoutProductConfigs(sharedConfig));
        setScopeSharedConfig(withProductConfig(sharedConfig, productId, follows ? null : scopedConfig));
        writeWorkflow(follows ? undefined : label, () => markDesignSaved(scopedConfig));
        return;
      }

      // The design chosen on Generate Video keeps its settings in the run group, so the same Save stores those too.
      // Only while the group waits: once the videos started the group refuses changes, and a re-render carries them.
      const scoped =
        designScope &&
        scopedConfig &&
        group?.status === "waiting_for_targets" &&
        group.workflowId === workflowId &&
        JSON.stringify(scopedConfig) !== JSON.stringify(designScope.baseConfig)
          ? { group, scope: designScope, config: scopedConfig }
          : null;
      if (!scoped) {
        writeWorkflow();
        return;
      }
      storeProductConfig(
        {
          groupId: scoped.group.id,
          expectedRevision: scoped.group.revision,
          productId: scoped.scope.productId,
          artworkGroupKey: scoped.scope.artworkGroupKey,
          config: scoped.config as GenerateVideoConfig,
        },
        {
          onSuccess: () => {
            markDesignSaved(scoped.config);
            writeWorkflow(scoped.scope.label);
          },
        }
      );
    },
    [buildSaveInput, group, markDesignSaved, markSaved, setScopeSharedConfig, storeProductConfig, updateWorkflow]
  );

  return { saveWorkflow, buildSaveInput, isSaving: isSaving || isStoringProduct };
};
