import type { WorkflowNodeConfig } from "@/types/workflow";

export const moveScene = <T>(order: T[], index: number, direction: -1 | 1): T[] => {
  const next = [...order];
  const targetIndex = index + direction;
  if (index < 0 || index >= next.length || targetIndex < 0 || targetIndex >= next.length) return next;
  [next[index], next[targetIndex]] = [next[targetIndex] as T, next[index] as T];
  return next;
};

export const resetVideoTemplateConfig = (config: WorkflowNodeConfig): WorkflowNodeConfig => ({
  ...config,
  template: "auto",
  templateVersion: 2,
  assetSelection: "automatic",
  selectedMockupIds: [],
  sceneOrder: [],
  sceneMotionPresets: [],
});
