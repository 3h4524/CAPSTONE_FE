import { RUN_ORDER } from "@/constants/workflow";
import { MAX_VIDEO_MOCKUPS, type NodePanelSection } from "@/constants/workflow-panel";
import { productTypeLabel } from "@/helpers/mockup-template";
import { readNumber, readString, readStringArray, readTemplateColors } from "@/helpers/workflow-config";
import { countApprovals } from "@/helpers/workflow-run";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { Product } from "@/types/batches";
import type { MockupTemplate } from "@/types/mockup-templates";
import type { MockupAsset } from "@/types/video-workflow";
import type { WorkflowField, WorkflowNode, WorkflowNodeConfig, WorkflowNodeType, WorkflowOption } from "@/types/workflow";

/** A batch's products as dropdown choices: the name, with the product type and status under it. */
export const toProductOptions = (products: Product[] | undefined): WorkflowOption[] =>
  (products ?? []).map((product) => ({
    value: product.id,
    label: product.name,
    hint: `${productTypeLabel(product.productType)} · ${product.status.replaceAll("_", " ")}`,
  }));

export type PanelStatTone = "default" | "warning" | "muted";

export type PanelStat = { label: string; value: string; tone?: PanelStatTone };

/** Where a step sits among the run steps this workflow actually has, or null for a step outside the run. */
export const findPipelinePosition = (type: WorkflowNodeType, nodes: WorkflowNode[]) => {
  const steps = RUN_ORDER.filter((step) => nodes.some((node) => node.data.type === step));
  const index = steps.indexOf(type);
  return index < 0 ? null : { steps, index };
};

/** Width and height of a tile of the given ratio whose longer side is `longest` pixels. */
export const ratioTileSize = ([width, height]: [number, number], longest: number) =>
  width >= height ? { width: longest, height: Math.round((longest * height) / width) } : { width: Math.round((longest * width) / height), height: longest };

/** A workflow check's message as the node's own panel shows it, without the node's name in front. */
export const issueTextForNode = (message: string, label: string) =>
  message.startsWith(`${label}: `) ? message.slice(label.length + 2) : message;

/** The node's fields under each of its sections; fields no section names follow in a last, untitled group. */
export const groupPanelFields = (fields: WorkflowField[], sections: NodePanelSection[] | undefined) => {
  if (!sections) return { grouped: [], rest: fields };
  const named = new Set(sections.flatMap((section) => section.fields));
  return {
    grouped: sections.map((section) => ({
      section,
      fields: section.fields.map((name) => fields.find((field) => field.name === name)).filter((field): field is WorkflowField => Boolean(field)),
    })),
    rest: fields.filter((field) => !named.has(field.name)),
  };
};

export type NodeOverviewInput = {
  type: WorkflowNodeType;
  config: WorkflowNodeConfig;
  /** Config of the workflow's Apply mock-up step, which holds the video's choice of mock-ups. */
  mockupConfig: WorkflowNodeConfig | undefined;
  products: Product[] | undefined;
  startedRunCount: number | undefined;
  templates: MockupTemplate[] | undefined;
  assets: MockupAsset[] | undefined;
  job: BatchJobDetail | null;
};

const DASH = "—";
const countText = (value: number | undefined) => (value === undefined ? DASH : String(value));

// The three facts at the top of a node's panel. Steps outside Product input → Mockup Approval have none.
export const buildNodeOverview = (input: NodeOverviewInput): PanelStat[] => {
  const { type, config, products, job } = input;
  const pending = products?.filter((product) => product.status === "pending").length;

  switch (type) {
    case "product-input": {
      if (!readString(config.batchId)) return [];
      return [
        { label: "Products", value: countText(products?.length) },
        { label: "Pending", value: countText(pending), tone: pending === 0 ? "warning" : "default" },
        { label: "Runs", value: countText(input.startedRunCount) },
      ];
    }
    case "prompt-synthesis": {
      const instructions = readString(config.instructions).trim();
      return [
        // The names are in the previews below, so the strip only says what is in place.
        { label: "Template", value: readString(config.designTemplateId) ? "Set" : "Not set", tone: readString(config.designTemplateId) ? "default" : "warning" },
        { label: "Style", value: readString(config.stylePresetId) ? "Set" : "None", tone: readString(config.stylePresetId) ? "default" : "muted" },
        { label: "Direction", value: instructions ? `${instructions.length} chars` : "None", tone: instructions ? "default" : "muted" },
      ];
    }
    case "design-image": {
      const variants = readNumber(config.variants);
      return [
        { label: "Variants", value: countText(variants) },
        { label: "Ratio", value: readString(config.aspectRatio) || DASH },
        { label: "Images", value: variants !== undefined && pending !== undefined ? `~${variants * pending}` : DASH, tone: pending === 0 ? "warning" : "default" },
      ];
    }
    case "design-approval": {
      const counts = job ? countApprovals(job) : undefined;
      return [
        { label: "Mode", value: config.mode === "auto" ? "Automatic" : "Manual" },
        { label: "Approved", value: countText(counts?.approved) },
        { label: "To review", value: countText(counts?.pending), tone: counts && counts.pending > 0 ? "warning" : "default" },
      ];
    }
    case "apply-mockup": {
      const templateIds = readStringArray(config.mockupTemplateIds);
      const colors = Object.entries(readTemplateColors(config.templateColors))
        .filter(([templateId]) => templateIds.includes(templateId))
        .reduce((total, [, list]) => total + list.length, 0);
      const productTypes = input.templates
        ? new Set(input.templates.filter((template) => templateIds.includes(template.id)).map((template) => template.productType.toLowerCase())).size
        : undefined;
      return [
        { label: "Templates", value: String(templateIds.length), tone: templateIds.length === 0 ? "warning" : "default" },
        { label: "Colors", value: colors > 0 ? String(colors) : "Own", tone: colors > 0 ? "default" : "muted" },
        { label: "Types", value: countText(productTypes) },
      ];
    }
    case "approval-gate": {
      const assets = input.assets;
      const approved = assets?.filter((asset) => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision).length;
      const selected = readStringArray(input.mockupConfig?.mockupIds).length;
      return [
        { label: "Mock-ups", value: countText(assets?.length) },
        { label: "Approved", value: countText(approved) },
        { label: "For video", value: selected ? `${selected}/${MAX_VIDEO_MOCKUPS}` : "Auto", tone: selected ? "default" : "muted" },
      ];
    }
    default:
      return [];
  }
};
