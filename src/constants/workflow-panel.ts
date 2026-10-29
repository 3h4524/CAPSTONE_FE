import type { WorkflowNodeType } from "@/types/workflow";

export type NodePanelSection = {
  title: string;
  description?: string;
  /** Names of the node's fields shown in this section, in order. */
  fields: string[];
};

// The settings of these steps are grouped under titled sections. A step that is not listed shows its
// fields in one plain list.
export const NODE_PANEL_SECTIONS: Partial<Record<WorkflowNodeType, NodePanelSection[]>> = {
  "product-input": [
    { title: "Input", fields: ["batchId"] },
    { title: "Video", fields: ["productId"] },
  ],
  "prompt-synthesis": [
    { title: "Prompt", fields: ["designTemplateId", "stylePresetId", "instructions"] },
  ],
  "design-image": [
    { title: "Output", fields: ["variants", "aspectRatio"] },
  ],
  "design-approval": [
    { title: "Review", fields: ["mode"] },
  ],
  "apply-mockup": [
    { title: "Templates", description: "Each approved design is placed on every chosen template of its product type.", fields: ["mockupTemplateIds"] },
  ],
  "approval-gate": [
    { title: "Review", fields: ["mode"] },
  ],
};

// The list of a dropdown in the node panel. Radix hides the list's scrollbar and scrolls with arrow
// buttons instead; these turn that around, so a long list shows a thin scrollbar that says there is more.
export const PANEL_SELECT_CONTENT_CLASS = [
  "max-h-[min(20rem,var(--radix-select-content-available-height))]",
  "[&>[data-slot=select-scroll-up-button]]:hidden [&>[data-slot=select-scroll-down-button]]:hidden",
  "[&_[data-radix-select-viewport]]:[scrollbar-width:thin]! [&_[data-radix-select-viewport]]:[scrollbar-color:var(--color-slate-300)_transparent]",
  // Safari before scrollbar-width: Radix's display:none on the scrollbar is undone here. Radix's style is outside
  // Tailwind's layers, so it wins over any layered rule; the two overrides of it need !important.
  "[&_[data-radix-select-viewport]::-webkit-scrollbar]:block! [&_[data-radix-select-viewport]::-webkit-scrollbar]:w-1.5",
  "[&_[data-radix-select-viewport]::-webkit-scrollbar-thumb]:rounded-full [&_[data-radix-select-viewport]::-webkit-scrollbar-thumb]:bg-slate-300",
].join(" ");

/** Mock-ups a video may use at most; the server applies the same limit. */
export const MAX_VIDEO_MOCKUPS = 8;
