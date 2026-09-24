"use client";

import type { DragEvent } from "react";

import { WorkflowNodeCard } from "@/components/workflows/nodes/workflow-node-card";
import { WORKFLOW_DND_MIME } from "@/constants/workflow";
import { isWorkflowNodeType } from "@/helpers/workflow-config";
import { createWorkflowNode, isConnectionAllowed } from "@/helpers/workflow-graph";
import { useWorkflowStore } from "@/stores/workflow";
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";

const NODE_TYPES: NodeTypes = { workflow: WorkflowNodeCard };

const DEFAULT_EDGE_OPTIONS = { type: "smoothstep" };

const DELETE_KEYS = ["Backspace", "Delete"];

export const WorkflowCanvas = () => {
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const connect = useWorkflowStore((state) => state.connect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const selectNode = useWorkflowStore((state) => state.selectNode);

  const runningNodeIds = new Set(
    nodes.filter((node) => node.data.status === "running").map((node) => node.id)
  );
  const displayedEdges = edges.map((edge) => ({ ...edge, animated: runningNodeIds.has(edge.target) }));

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const dropNode = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(WORKFLOW_DND_MIME);
    if (isRunning || !isWorkflowNodeType(type)) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(createWorkflowNode(type, { x: position.x - 112, y: position.y - 40 }));
  };

  const validateConnection = (connection: Connection | Edge) => isConnectionAllowed(connection, edges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={displayedEdges}
      nodeTypes={NODE_TYPES}
      defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={connect}
      isValidConnection={validateConnection}
      onNodeClick={(_, node) => selectNode(node.id)}
      onPaneClick={() => selectNode(null)}
      onDragOver={allowDrop}
      onDrop={dropNode}
      nodesDraggable={!isRunning}
      nodesConnectable={!isRunning}
      elementsSelectable={!isRunning}
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
  );
};
