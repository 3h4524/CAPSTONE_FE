import type { Region } from "@/types/video-workflow";
import type { WorkflowNodeConfig } from "@/types/workflow";

export type CropAnchor = "center" | "left" | "right" | "top" | "bottom";

export const createFramingCrop = (base: Region, zoom: number, anchor: CropAnchor): Region => {
  const scale = Math.max(1, Math.min(1.2, zoom));
  const width = base.width / scale;
  const height = base.height / scale;
  const point = anchor === "left" ? [0, 0.5]
    : anchor === "right" ? [1, 0.5]
      : anchor === "top" ? [0.5, 0]
        : anchor === "bottom" ? [0.5, 1] : [0.5, 0.5];
  return {
    x: Number((base.x + (base.width - width) * point[0]!).toFixed(6)),
    y: Number((base.y + (base.height - height) * point[1]!).toFixed(6)),
    width: Number(width.toFixed(6)),
    height: Number(height.toFixed(6)),
  };
};

export const setStandardSceneFraming = (config: WorkflowNodeConfig, mockupId: string,
  baseCrop: Region, startCrop: Region | null, endCrop: Region | null): WorkflowNodeConfig => {
  const current = Array.isArray(config.standardScenes)
    ? config.standardScenes.filter((value): value is { mockupId: string; baseCrop?: Region | null; startCrop?: Region | null; endCrop?: Region | null } =>
      typeof value === "object" && value !== null && "mockupId" in value && typeof value.mockupId === "string")
    : [];
  const remaining = current.filter(scene => scene.mockupId !== mockupId);
  const standardScenes = startCrop || endCrop ? [...remaining, { mockupId, baseCrop, startCrop, endCrop }] : remaining;
  return { ...config, standardScenes };
};

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
  standardScenes: [],
});
