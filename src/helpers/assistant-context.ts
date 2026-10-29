import {
  ASSISTANT_CANVAS_MAX_NODES,
  ASSISTANT_NODE_CONFIG_MAX_BYTES,
  ASSISTANT_ROUTE_MAX_LENGTH,
} from "@/constants/assistant";
import type { WorkflowEditorState } from "@/stores/workflow";
import type { AssistantCanvasContext, AssistantClientContext } from "@/types/assistant";
import type { WorkflowNodeConfig } from "@/types/workflow";

type ContextWorkflow = Pick<
  WorkflowEditorState,
  "workflowId" | "revision" | "isDirty" | "nodes" | "edges" | "selectedNodeIds" | "videoRunId"
>;

const limitConfig = (config: WorkflowNodeConfig): WorkflowNodeConfig =>
  new TextEncoder().encode(JSON.stringify(config)).length > ASSISTANT_NODE_CONFIG_MAX_BYTES ? {} : config;

const buildCanvas = (workflowId: string, workflow: ContextWorkflow): AssistantCanvasContext => {
  const nodes = workflow.nodes.slice(0, ASSISTANT_CANVAS_MAX_NODES);
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    workflowId,
    revision: workflow.revision,
    isDirty: workflow.isDirty,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      config: limitConfig(node.data.config),
    })),
    edges: workflow.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
  };
};

export const buildAssistantContext = (input: {
  pathname: string;
  search: string;
  workflow: ContextWorkflow;
}): AssistantClientContext => {
  const { pathname, search, workflow } = input;
  const route = `${pathname}${search}`.slice(0, ASSISTANT_ROUTE_MAX_LENGTH);
  const params = new URLSearchParams(search);
  const requestedId = params.get("id");
  const isOpenWorkflow =
    pathname === "/workflows" && workflow.workflowId !== null && requestedId === workflow.workflowId;

  if (!isOpenWorkflow || workflow.workflowId === null) {
    return { route, workflowId: null, runId: null, selectedNodeIds: [], canvas: null };
  }

  return {
    route,
    workflowId: workflow.workflowId,
    runId: params.get("run") ?? workflow.videoRunId,
    selectedNodeIds: workflow.selectedNodeIds,
    canvas: buildCanvas(workflow.workflowId, workflow),
  };
};
