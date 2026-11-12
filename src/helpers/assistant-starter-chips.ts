import { ASSISTANT_STARTER_CHIPS, type AssistantStarterChipRequirement } from "@/constants/assistant";
import { getAssistantSelectedStepLabels } from "@/helpers/assistant-context";
import type { WorkflowEditorState } from "@/stores/workflow";

type StarterChipWorkflow = Pick<WorkflowEditorState, "workflowId" | "isDirty" | "nodes" | "selectedNodeIds">;

const meetsRequirement = (requirement: AssistantStarterChipRequirement, pathname: string, workflow: StarterChipWorkflow) =>
  requirement === "selectedStep"
    ? getAssistantSelectedStepLabels(pathname, workflow).length > 0
    : workflow.workflowId !== null && !workflow.isDirty;

export const getAssistantStarterChips = (pathname: string, workflow: StarterChipWorkflow): string[] =>
  (ASSISTANT_STARTER_CHIPS.find((group) => group.match(pathname))?.chips ?? [])
    .filter((chip) => chip.requires === undefined || meetsRequirement(chip.requires, pathname, workflow))
    .map((chip) => chip.label);
