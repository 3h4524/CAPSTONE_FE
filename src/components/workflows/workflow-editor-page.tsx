"use client";

import { WorkflowWorkspace } from "@/components/workflows/workflow-workspace";
import { ReactFlowProvider } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

export const WorkflowEditorPage = () => (
  <ReactFlowProvider>
    <WorkflowWorkspace />
  </ReactFlowProvider>
);
