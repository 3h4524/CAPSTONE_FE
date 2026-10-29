"use client";

import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";

import { SelectionToolbar } from "@/components/workflows/canvas/selection-toolbar";
import { ShortcutCheatsheet } from "@/components/workflows/canvas/shortcut-cheatsheet";
import { WorkflowFloatingEdge } from "@/components/workflows/canvas/workflow-floating-edge";
import { NodeView } from "@/components/workflows/nodes/node-view";
import { NODE_CARD_WIDTHS, WORKFLOW_DND_MIME } from "@/constants/workflow";
import { showWorkflowActionToast } from "@/helpers/toast";
import { getWorkflowNodeDefinition, isWorkflowNodeType } from "@/helpers/workflow-config";
import {
  createWorkflowNode,
  getConnectableNodeIds,
  getConnectionIssue,
  isConnectionAllowed,
} from "@/helpers/workflow-graph";
import { useCanvasShortcuts } from "@/hooks/use-canvas-shortcuts";
import { useSelectModifierHeld } from "@/hooks/use-select-modifier-held";
import { useWorkflowSave } from "@/hooks/use-workflow-save";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowConnectionStore } from "@/stores/workflow-connection";
import { cn } from "@/utils/cn";
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeTypes,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";

const NODE_TYPES: NodeTypes = { workflow: NodeView };

const EDGE_TYPES: EdgeTypes = { floating: WorkflowFloatingEdge };

const DEFAULT_EDGE_OPTIONS = {
  type: "floating",
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--wf-faint)" },
};

const DELETE_KEYS = ["Backspace", "Delete"];

const getNodeIdAtPoint = (x: number, y: number) =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>(".react-flow__node")?.dataset.id ?? null;

const getNodeIdAtPointer = (event: MouseEvent | TouchEvent) => {
  const x = "clientX" in event ? event.clientX : event.changedTouches[0]?.clientX;
  const y = "clientY" in event ? event.clientY : event.changedTouches[0]?.clientY;
  if (x === undefined || y === undefined) return null;
  return getNodeIdAtPoint(x, y);
};

export const WorkflowCanvas = () => {
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const connect = useWorkflowStore((state) => state.connect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNodes = useWorkflowStore((state) => state.selectNodes);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const beginNodeDrag = useWorkflowStore((state) => state.beginNodeDrag);
  const commitNodeDrag = useWorkflowStore((state) => state.commitNodeDrag);
  const connectionSourceNodeId = useWorkflowConnectionStore((state) => state.sourceNodeId);
  const startConnection = useWorkflowConnectionStore((state) => state.start);
  const hoverConnection = useWorkflowConnectionStore((state) => state.hover);
  const resetConnection = useWorkflowConnectionStore((state) => state.reset);
  const { saveWorkflow } = useWorkflowSave();

  const selectModifierHeld = useSelectModifierHeld();

  useCanvasShortcuts({ saveWorkflow });

  const runningNodeIds = new Set(
    nodes.filter((node) => node.data.status === "running").map((node) => node.id)
  );
  const displayedEdges = edges.map((edge) => ({
    ...edge,
    animated: runningNodeIds.has(edge.target),
  }));

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropNode = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(WORKFLOW_DND_MIME);
    if (isRunning || !isWorkflowNodeType(type)) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(
      createWorkflowNode(type, { x: position.x - NODE_CARD_WIDTHS[type] / 2, y: position.y - 40 })
    );
  };

  const validateConnection = (connection: Connection | Edge) =>
    isConnectionAllowed(connection, edges, nodes);

  const canConnectToNode = (nodeId: string, handleType: "source" | "target") => {
    const node = nodes.find((item) => item.id === nodeId);
    const definition = node ? getWorkflowNodeDefinition(node.data.type) : null;
    return handleType === "source" ? Boolean(definition?.hasOutput) : Boolean(definition?.hasInput);
  };

  const resolveConnection = (
    fromNodeId: string,
    fromHandleType: "source" | "target" | null,
    targetId: string
  ) => {
    const fromTargetHandle = fromHandleType === "target";
    const handleType = fromTargetHandle ? "source" : "target";
    if (!canConnectToNode(targetId, handleType))
      return { connection: null, issue: "That node cannot accept this connection." };
    const source = fromTargetHandle ? targetId : fromNodeId;
    const target = fromTargetHandle ? fromNodeId : targetId;
    const connection: Connection = { source, target, sourceHandle: null, targetHandle: null };
    return { connection, issue: getConnectionIssue(connection, edges, nodes) };
  };

  const handleConnectionPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!connectionSourceNodeId) return;
    const targetId = getNodeIdAtPoint(event.clientX, event.clientY);
    if (!targetId || targetId === connectionSourceNodeId) {
      hoverConnection(null, null);
      return;
    }
    const { sourceHandleType } = useWorkflowConnectionStore.getState();
    const { issue } = resolveConnection(connectionSourceNodeId, sourceHandleType, targetId);
    hoverConnection(targetId, issue === null);
  };

  const clearCanvasSelection = () => {
    clearSelection();
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      className={cn("relative h-full w-full", selectModifierHeld && "wf-select-mode")}
      onPointerMoveCapture={handleConnectionPointerMove}
      onPointerLeave={() => hoverConnection(null, null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={displayedEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={connect}
        isValidConnection={validateConnection}
        onConnectStart={(_, params) => {
          if (params.nodeId)
            startConnection(
              params.nodeId,
              params.handleType,
              getConnectableNodeIds(params.nodeId, params.handleType, nodes, edges)
            );
        }}
        onConnectEnd={(event, state) => {
          const hoveredNodeId = useWorkflowConnectionStore.getState().hoveredNodeId;
          resetConnection();
          if (!state.fromNode || state.isValid) return;
          const targetId = state.toNode?.id ?? getNodeIdAtPointer(event) ?? hoveredNodeId;
          if (!targetId) return;
          const { connection, issue } = resolveConnection(
            state.fromNode.id,
            state.fromHandle?.type ?? null,
            targetId
          );
          if (issue || !connection) {
            showWorkflowActionToast("warning", issue ?? "That node cannot accept this connection.");
            return;
          }
          connect(connection);
        }}
        onSelectionChange={({ nodes: selectedNodes }) =>
          selectNodes(selectedNodes.map((node) => node.id))
        }
        onPaneClick={clearCanvasSelection}
        onNodeDragStart={beginNodeDrag}
        onNodeDragStop={commitNodeDrag}
        onDragOver={allowDrop}
        onDrop={dropNode}
        nodesDraggable={!isRunning}
        nodesConnectable={!isRunning}
        connectOnClick={!isRunning}
        connectionRadius={44}
        elementsSelectable
        selectionKeyCode="Shift"
        deleteKeyCode={isRunning ? null : DELETE_KEYS}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="hidden! md:block!" />
      </ReactFlow>
      <SelectionToolbar />
      <ShortcutCheatsheet />
    </div>
  );
};
