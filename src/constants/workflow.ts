import {
  Archive,
  CheckCircle2,
  FileText,
  Film,
  ImageIcon,
  Layers3,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react";

import type {
  WorkflowCategoryDefinition,
  WorkflowDefinition,
  WorkflowNodeDefinition,
  WorkflowNodeType,
} from "@/types/workflow";

export const WORKFLOW_DND_MIME = "application/x-apcs-workflow-node";

export const WORKFLOW_MOCK_STORAGE_KEY = "apcs.workflows.mock";

export const DEFAULT_WORKFLOW_NAME = "Etsy POD pipeline";

export const NEW_WORKFLOW_NAME = "Untitled workflow";

export const NODE_CARD_WIDTHS: Record<WorkflowNodeType, number> = {
  "product-input": 240,
  "prompt-synthesis": 240,
  "design-image": 288,
  "approval-gate": 240,
  "apply-mockup": 288,
  "generate-video": 288,
  "review-video": 288,
  "generate-listing": 240,
  "export-zip": 240,
  "publish-etsy": 240,
  "publish-printify": 240,
};

const PUBLISH_FIELDS = [
  {
    kind: "switch",
    name: "publishImmediately",
    label: "Publish immediately",
    description: "Make the listing live right away instead of saving it as a draft.",
  },
] as const;

export const WORKFLOW_CATEGORIES: WorkflowCategoryDefinition[] = [
  { id: "trigger", label: "Trigger", accentClassName: "bg-sky-100 text-sky-700", iconClassName: "text-sky-600" },
  { id: "ai", label: "AI generation", accentClassName: "bg-violet-100 text-violet-700", iconClassName: "text-violet-600" },
  { id: "review", label: "Review", accentClassName: "bg-amber-100 text-amber-700", iconClassName: "text-amber-600" },
  { id: "output", label: "Output", accentClassName: "bg-emerald-100 text-emerald-700", iconClassName: "text-emerald-600" },
];

export const WORKFLOW_NODE_DEFINITIONS: Record<WorkflowNodeType, WorkflowNodeDefinition> = {
  "product-input": {
    type: "product-input",
    label: "Product input",
    description: "Choose one product from a batch for this video run.",
    icon: Layers3,
    category: "trigger",
    hasInput: false,
    hasOutput: true,
    defaultConfig: { batchId: "", productId: "" },
    fields: [{ kind: "source-select", name: "batchId", label: "Batch", source: "batches" }, { kind: "product-select", name: "productId", label: "Product" }],
  },
  "prompt-synthesis": {
    type: "prompt-synthesis",
    label: "Prompt synthesis",
    description: "Combine a design template and art style into a design prompt.",
    icon: Sparkles,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { designTemplateId: "", stylePresetId: "", instructions: "" },
    fields: [
      {
        kind: "source-select",
        name: "designTemplateId",
        label: "Design template",
        source: "design-templates",
      },
      { kind: "source-select", name: "stylePresetId", label: "Art style", source: "style-presets" },
      {
        kind: "textarea",
        name: "instructions",
        label: "Extra instructions",
        placeholder: "Anything the prompt should always include or avoid.",
      },
    ],
  },
  "design-image": {
    type: "design-image",
    label: "Design image",
    description: "Generate design variations for every product.",
    icon: ImageIcon,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { model: "leonardo", variants: 2 },
    fields: [
      {
        kind: "select",
        name: "model",
        label: "Image model",
        options: [
          { value: "leonardo", label: "Leonardo.ai" },
          { value: "sdxl", label: "Stable Diffusion XL" },
        ],
      },
      { kind: "number", name: "variants", label: "Variants per product", min: 1, max: 4 },
    ],
  },
  "approval-gate": {
    type: "approval-gate",
    label: "Mockup Approval",
    description: "Review each mockup at its current revision before rendering.",
    icon: CheckCircle2,
    category: "review",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { mode: "manual" },
    fields: [
      {
        kind: "select",
        name: "mode",
        label: "Approval mode",
        options: [
          { value: "manual", label: "Manual review" },
        ],
      },
    ],
  },
  "apply-mockup": {
    type: "apply-mockup",
    label: "Apply mock-up",
    description: "Upload or select up to eight static mockups. Automatic compositing is not part of MVP.",
    icon: Shirt,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { mockupIds: [], artworkGroupKey: "" },
    fields: [],
  },
  "generate-video": {
    type: "generate-video",
    label: "Generate Video",
    description: "Silent Standard Showcase with square, portrait and landscape output. AI modes are coming later.",
    icon: Film,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { mode: "standard", target: "etsy", template: "auto", templateVersion: 2, outputFormat: "tall", durationSeconds: 12, assetSelection: "automatic", selectedMockupIds: [], sceneOrder: [], sceneMotionPresets: [], textOverlay: "", standardOptions: { motionPreset: "varied", crop: "safe", transition: "fade" }, fallbackToStandard: true },
    fields: [
      { kind: "video-modes", name: "mode", label: "Video mode" },
      { kind: "video-formats", name: "outputFormat", label: "Output format" },
      { kind: "number", name: "durationSeconds", label: "Duration", min: 3, max: 15, unit: "s" },
      { kind: "textarea", name: "textOverlay", label: "Text overlay", placeholder: "Optional short caption (120 characters)" },
      { kind: "select", name: "standardOptions.transition", label: "Transition", options: [{ value: "fade", label: "Fade" }, { value: "cut", label: "Cut" }] },
    ],
  },
  "review-video": { type: "review-video", label: "Review Video", description: "Approve the exact video version before export.", icon: CheckCircle2, category: "review", hasInput: true, hasOutput: true, defaultConfig: {}, fields: [] },
  "generate-listing": {
    type: "generate-listing",
    label: "Listing content",
    description: "Write the SEO title, 13 tags and description for each product.",
    icon: FileText,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { model: "gpt-4o", tone: "friendly", includeSeoScore: true },
    fields: [
      {
        kind: "select",
        name: "model",
        label: "Language model",
        options: [
          { value: "gpt-4o", label: "GPT-4o" },
          { value: "gemini", label: "Gemini" },
        ],
      },
      {
        kind: "select",
        name: "tone",
        label: "Tone",
        options: [
          { value: "friendly", label: "Friendly" },
          { value: "professional", label: "Professional" },
          { value: "playful", label: "Playful" },
        ],
      },
      {
        kind: "switch",
        name: "includeSeoScore",
        label: "SEO score",
        description: "Score each listing from 0 to 100 with improvement tips.",
      },
    ],
  },
  "export-zip": {
    type: "export-zip",
    label: "Export ZIP",
    description: "Package the final assets into a ready-to-upload ZIP file.",
    icon: Archive,
    category: "output",
    hasInput: true,
    hasOutput: false,
    defaultConfig: {},
    fields: [],
  },
  "publish-etsy": {
    type: "publish-etsy",
    label: "Publish to Etsy",
    description: "Create Etsy listings from the finished products.",
    icon: Store,
    category: "output",
    hasInput: true,
    hasOutput: false,
    defaultConfig: { publishImmediately: false },
    fields: [...PUBLISH_FIELDS],
  },
  "publish-printify": {
    type: "publish-printify",
    label: "Push to Printify",
    description: "Send the designs and listing content to Printify.",
    icon: ShoppingBag,
    category: "output",
    hasInput: true,
    hasOutput: false,
    defaultConfig: { publishImmediately: false },
    fields: [...PUBLISH_FIELDS],
  },
};

const pipelineNode = (id: string, type: WorkflowNodeType, x: number, y: number) => ({
  id,
  type,
  label: WORKFLOW_NODE_DEFINITIONS[type].label,
  position: { x, y },
  config: { ...WORKFLOW_NODE_DEFINITIONS[type].defaultConfig },
});

export const DEFAULT_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 2,
  nodes: [
    pipelineNode("input", "product-input", 0, 0),
    pipelineNode("mockup", "apply-mockup", 0, 200),
    pipelineNode("approval", "approval-gate", 0, 480),
    pipelineNode("video", "generate-video", 0, 680),
    pipelineNode("review", "review-video", 0, 960),
    pipelineNode("export", "export-zip", 0, 1200),
  ],
  edges: [
    { id: "input-mockup", source: "input", target: "mockup" },
    { id: "mockup-approval", source: "mockup", target: "approval" },
    { id: "approval-video", source: "approval", target: "video" },
    { id: "video-review", source: "video", target: "review" },
    { id: "review-export", source: "review", target: "export" },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const STARTER_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 2,
  nodes: [pipelineNode("input", "product-input", 0, 0)],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};
