import { getErrorMessage } from "@/helpers/error-message";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowContentIssuesStore, type WorkflowContentIssue } from "@/stores/workflow-content-issues";
import type { WorkflowNodeType } from "@/types/workflow";

type NodeRef = { id: string; data: { type: WorkflowNodeType } };
type ProblemResponse = { response?: { data?: { code?: unknown } } };

const CONTENT_POLICY_CODE = "ContentPolicyViolation";

// Where a blocked text lives, from the name the backend gives it in "(in the job instructions)". The names are those
// of WorkflowService.VideoTexts (saving) and DesignGenerationService.StartAsync (starting a run).
const placeOf = (where: string): { type: WorkflowNodeType; field: string | null } | null => {
  const text = where.trim().toLowerCase();
  if (text === "the job instructions") return { type: "prompt-synthesis", field: "instructions" };
  const keyframe = /^scene (\d+) keyframe prompt$/.exec(text);
  if (keyframe) return { type: "generate-video", field: `aiScenes.${Number(keyframe[1]) - 1}.studioPrompt` };
  const customPrompt = /^scene (\d+) custom prompt$/.exec(text);
  if (customPrompt) return { type: "generate-video", field: `aiScenes.${Number(customPrompt[1]) - 1}.customPrompt` };
  // The shared directions and a scene's instructions, start, action or end have no field of their own on screen.
  if (text === "the shared scene directions" || /^scene \d+ (instructions|start|action|end)$/.test(text))
    return { type: "generate-video", field: null };
  return null;
};

/**
 * The settings of the open workflow a content-policy refusal is about, so the canvas and the panel can mark them.
 * Empty for any other failure, or when the refusal does not say where the text was.
 */
export const workflowContentIssues = (error: unknown, nodes: NodeRef[]): WorkflowContentIssue[] => {
  const code = (error as ProblemResponse | null)?.response?.data?.code;
  if (code !== CONTENT_POLICY_CODE) return [];
  const message = getErrorMessage(error);
  const where = /\(in ([^)]+)\)/i.exec(message)?.[1];
  const place = where ? placeOf(where) : null;
  if (!place) return [];
  return nodes
    .filter((node) => node.data.type === place.type)
    .map((node) => ({ nodeId: node.id, field: place.field, message }));
};

/** Marks what a failed save or run start was refused for, and opens the step it is on. */
export const reportWorkflowContentIssues = (error: unknown) => {
  const { nodes, selectNode, selectedNodeIds } = useWorkflowStore.getState();
  const issues = workflowContentIssues(error, nodes);
  if (issues.length === 0) return;
  useWorkflowContentIssuesStore.getState().report(issues);
  if (!issues.some((issue) => selectedNodeIds.includes(issue.nodeId))) selectNode(issues[0]!.nodeId);
};
