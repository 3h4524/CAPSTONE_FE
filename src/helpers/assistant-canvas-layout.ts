import { ASSISTANT_LAYOUT_DEFAULT_NODE_HEIGHT_PX, ASSISTANT_LAYOUT_GAPS } from "@/constants/assistant";
import { NODE_CARD_WIDTHS } from "@/constants/workflow";
import type { AssistantArrangeLayout, AssistantArrangePayload, AssistantArrangeSpacing } from "@/types/assistant";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

type Size = { width: number; height: number };

type Placed = { id: string; x: number; y: number };

const sizeOf = (node: WorkflowNode): Size => ({
  width: node.measured?.width ?? NODE_CARD_WIDTHS[node.data.type],
  height: node.measured?.height ?? ASSISTANT_LAYOUT_DEFAULT_NODE_HEIGHT_PX,
});

const byCurrentPosition = (a: WorkflowNode, b: WorkflowNode) => a.position.y - b.position.y || a.position.x - b.position.x;

const assignLayers = (nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, number> => {
  const ids = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  edges.forEach((edge) => {
    if (ids.has(edge.source) && ids.has(edge.target)) incoming.get(edge.target)?.push(edge.source);
  });
  const layers = new Map<string, number>();
  const visiting = new Set<string>();
  const layerOf = (id: string): number => {
    const known = layers.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const layer = Math.max(-1, ...(incoming.get(id) ?? []).map(layerOf)) + 1;
    visiting.delete(id);
    layers.set(id, layer);
    return layer;
  };
  nodes.forEach((node) => layerOf(node.id));
  return layers;
};

const groupIntoLayers = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[][] => {
  const layerOf = assignLayers(nodes, edges);
  const grouped: WorkflowNode[][] = [];
  [...nodes].sort(byCurrentPosition).forEach((node) => {
    const layer = layerOf.get(node.id) ?? 0;
    grouped[layer] = [...(grouped[layer] ?? []), node];
  });
  return grouped.filter((group) => group !== undefined);
};

const layoutByLayers = (layers: WorkflowNode[][], gap: { x: number; y: number }, horizontal: boolean): Placed[] => {
  const mainGap = horizontal ? gap.x : gap.y;
  const crossGap = horizontal ? gap.y : gap.x;
  const main = (size: Size) => (horizontal ? size.width : size.height);
  const cross = (size: Size) => (horizontal ? size.height : size.width);
  const extents = layers.map((layer) => layer.reduce((total, node, index) => total + cross(sizeOf(node)) + (index > 0 ? crossGap : 0), 0));
  const widest = Math.max(0, ...extents);
  let mainOffset = 0;
  return layers.flatMap((layer, layerIndex) => {
    let crossOffset = (widest - (extents[layerIndex] ?? 0)) / 2;
    const thickness = Math.max(...layer.map((node) => main(sizeOf(node))));
    const placed = layer.map((node) => {
      const size = sizeOf(node);
      const position = horizontal ? { x: mainOffset, y: crossOffset } : { x: crossOffset, y: mainOffset };
      crossOffset += cross(size) + crossGap;
      return { id: node.id, ...position };
    });
    mainOffset += thickness + mainGap;
    return placed;
  });
};

const layoutGrid = (layers: WorkflowNode[][], gap: { x: number; y: number }, perRow: number): Placed[] => {
  const ordered = layers.flat();
  const columns = Math.max(1, perRow);
  const rows = Array.from({ length: Math.ceil(ordered.length / columns) }, (_, row) => ordered.slice(row * columns, (row + 1) * columns));
  const columnWidths = Array.from({ length: columns }, (_, column) =>
    Math.max(0, ...rows.map((row) => (row[column] ? sizeOf(row[column]).width : 0)))
  );
  let y = 0;
  return rows.flatMap((row) => {
    const rowHeight = Math.max(...row.map((node) => sizeOf(node).height));
    const placed = row.map((node, column) => ({
      id: node.id,
      x: columnWidths.slice(0, column).reduce((total, width) => total + width + gap.x, 0),
      y,
    }));
    y += rowHeight + gap.y;
    return placed;
  });
};

export const arrangeNodes = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: { layout: AssistantArrangeLayout; spacing: AssistantArrangeSpacing; perRow: number }
): WorkflowNode[] => {
  if (nodes.length < 2) return nodes;
  const gap = ASSISTANT_LAYOUT_GAPS[options.spacing];
  const layers = groupIntoLayers(nodes, edges);
  const placed =
    options.layout === "grid"
      ? layoutGrid(layers, gap, options.perRow)
      : layoutByLayers(layers, gap, options.layout === "horizontal");
  const anchorX = Math.min(...nodes.map((node) => node.position.x));
  const anchorY = Math.min(...nodes.map((node) => node.position.y));
  const positions = new Map(placed.map((item) => [item.id, item]));
  return nodes.map((node) => {
    const target = positions.get(node.id);
    return target ? { ...node, position: { x: Math.round(anchorX + target.x), y: Math.round(anchorY + target.y) } } : node;
  });
};

const LAYOUT_TEXT: Record<AssistantArrangeLayout, string> = {
  horizontal: "in one left-to-right line",
  vertical: "in one top-to-bottom column",
  grid: "in wrapped rows",
};

export const describeArrangement = (payload: AssistantArrangePayload): string => {
  const layout = payload.layout === "grid" ? `${LAYOUT_TEXT.grid} of ${payload.perRow}` : LAYOUT_TEXT[payload.layout];
  return `Arrange ${payload.nodeCount} nodes ${layout}, ${payload.spacing} spacing`;
};
