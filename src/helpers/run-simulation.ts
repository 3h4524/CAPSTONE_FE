import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

export const getPredecessors = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const ids = new Set(nodes.map((node) => node.id));
  const predecessors: Record<string, string[]> = Object.fromEntries(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    if (ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target)
      predecessors[edge.target].push(edge.source);
  });
  return predecessors;
};

export const findCycleNodes = (predecessors: Record<string, string[]>) => {
  const state: Record<string, "visiting" | "done"> = {};
  const cyclic = new Set<string>();
  const visit = (id: string): boolean => {
    if (state[id] === "done") return false;
    if (state[id] === "visiting") return true;
    state[id] = "visiting";
    const loops = predecessors[id].some(visit);
    state[id] = "done";
    if (loops) cyclic.add(id);
    return loops;
  };
  Object.keys(predecessors).forEach(visit);
  return cyclic;
};

export const chunkText = (text: string, size: number) =>
  Array.from({ length: Math.ceil(text.length / size) }, (_, index) => text.slice(index * size, (index + 1) * size));
