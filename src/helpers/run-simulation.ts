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

const toSvgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const artwork = (hue: number) =>
  `<circle cx="50" cy="44" r="22" fill="hsl(${hue} 70% 62%)"/>` +
  `<path d="M32 30 L36 16 L44 26 Z M68 30 L64 16 L56 26 Z" fill="hsl(${hue} 70% 62%)"/>` +
  `<circle cx="42" cy="42" r="3" fill="hsl(${hue} 40% 20%)"/><circle cx="58" cy="42" r="3" fill="hsl(${hue} 40% 20%)"/>` +
  `<path d="M44 52 Q50 57 56 52" stroke="hsl(${hue} 40% 20%)" stroke-width="2" fill="none" stroke-linecap="round"/>` +
  `<rect x="22" y="72" width="56" height="8" rx="4" fill="hsl(${hue} 45% 35%)"/>`;

export const sampleDesignImage = (hue: number) =>
  toSvgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<rect width="100" height="100" fill="hsl(${hue} 60% 94%)"/>${artwork(hue)}</svg>`
  );

export const sampleMockupImage = (hue: number) =>
  toSvgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<rect width="100" height="100" fill="hsl(${hue} 25% 88%)"/>` +
      `<rect x="24" y="22" width="44" height="58" rx="6" fill="#fff" stroke="hsl(${hue} 15% 70%)"/>` +
      `<path d="M68 34 h8 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-8" fill="none" stroke="hsl(${hue} 15% 70%)" stroke-width="5"/>` +
      `<g transform="translate(26 30) scale(0.4)">${artwork(hue)}</g></svg>`
  );
