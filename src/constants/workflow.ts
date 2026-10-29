import {
  Archive,
  CheckCircle2,
  FileText,
  Film,
  ImageIcon,
  Layers3,
  Shirt,
  ShoppingBag,
  Store,
  TextCursorInput,
} from "lucide-react";

import type {
  WorkflowCategoryDefinition,
  WorkflowDefinition,
  WorkflowNodeDefinition,
  WorkflowNodeType,
  WorkflowPosition,
} from "@/types/workflow";

export const WORKFLOW_DND_MIME = "application/x-apcs-workflow-node";

export const DUPLICATE_NODE_OFFSET = 48;
export const NODE_MOVE_DIRTY_THRESHOLD = 16;

export const HISTORY_LIMIT = 50;

export const HISTORY_GROUP_WINDOW_MS = 1500;

export const WORKFLOW_CANVAS_SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: "Select multiple nodes", keys: ["Ctrl/⌘", "Click"] },
  { action: "Box select nodes", keys: ["Shift", "Drag"] },
  { action: "Select all nodes", keys: ["Ctrl/⌘", "A"] },
  { action: "Copy selected nodes", keys: ["Ctrl/⌘", "C"] },
  { action: "Paste copied nodes", keys: ["Ctrl/⌘", "V"] },
  { action: "Duplicate selected nodes", keys: ["Ctrl/⌘", "D"] },
  { action: "Delete selected nodes", keys: ["Del"] },
  { action: "Undo", keys: ["Ctrl/⌘", "Z"] },
  { action: "Redo", keys: ["Ctrl/⌘", "Y"] },
  { action: "Save workflow", keys: ["Ctrl/⌘", "S"] },
  { action: "Clear selection", keys: ["Esc"] },
];

export const WORKFLOW_MOCK_STORAGE_KEY = "apcs.workflows.mock";

export const DEFAULT_WORKFLOW_NAME = "Etsy POD pipeline";

export const NEW_WORKFLOW_NAME = "Untitled workflow";

export const NODE_CARD_WIDTHS: Record<WorkflowNodeType, number> = {
  "product-input": 240,
  "prompt-synthesis": 240,
  "design-image": 288,
  "design-approval": 240,
  "apply-mockup": 288,
  "approval-gate": 240,
  "generate-video": 288,
  "review-video": 288,
  "generate-listing": 240,
  "export-zip": 240,
  "publish-etsy": 240,
  "publish-printify": 240,
};

// The ratios the image-generation API accepts.
const ASPECT_RATIO_OPTIONS = ["1:1", "16:9", "9:16", "4:3", "3:4"].map((ratio) => ({ value: ratio, label: ratio }));

// A run has two parts. The canvas drives the first as a batch job: designs, their approval and the
// mock-ups. The server then runs the second for one product: mock-up approval, video, video review
// and the ZIP. The remaining node types are laid out on the canvas but have no backend yet.
export const BATCH_RUN_NODE_TYPES: WorkflowNodeType[] = [
  "product-input",
  "prompt-synthesis",
  "design-image",
  "design-approval",
  "apply-mockup",
];

export const VIDEO_RUN_NODE_TYPES: WorkflowNodeType[] = ["approval-gate", "generate-video", "review-video", "export-zip"];

export const RUNNABLE_NODE_TYPES: WorkflowNodeType[] = [...BATCH_RUN_NODE_TYPES, ...VIDEO_RUN_NODE_TYPES, "generate-listing"];

// The order the steps of a run must be connected in (the backend checks the same order).
export const RUN_ORDER: WorkflowNodeType[] = [
  "product-input",
  "prompt-synthesis",
  "design-image",
  "design-approval",
  "apply-mockup",
  "approval-gate",
  "generate-video",
  "review-video",
  "export-zip",
];

const PUBLISH_FIELDS = [
  {
    kind: "switch",
    name: "publishImmediately",
    label: "Publish immediately",
    description: "Make the listing live right away instead of saving it as a draft.",
  },
] as const;

export const WORKFLOW_CATEGORIES: WorkflowCategoryDefinition[] = [
  { id: "trigger", label: "Trigger", accentClassName: "bg-wf-cat-trigger-soft text-wf-cat-trigger", iconClassName: "text-wf-cat-trigger" },
  { id: "ai", label: "AI generation", accentClassName: "bg-wf-cat-ai-soft text-wf-cat-ai", iconClassName: "text-wf-cat-ai" },
  { id: "review", label: "Review", accentClassName: "bg-wf-cat-review-soft text-wf-cat-review", iconClassName: "text-wf-cat-review" },
  { id: "output", label: "Output", accentClassName: "bg-wf-cat-output-soft text-wf-cat-output", iconClassName: "text-wf-cat-output" },
];

export const WORKFLOW_NODE_DEFINITIONS: Record<WorkflowNodeType, WorkflowNodeDefinition> = {
  "product-input": {
    type: "product-input",
    label: "Product input",
    description: "Start the workflow with the pending products of a batch.",
    icon: Layers3,
    category: "trigger",
    hasInput: false,
    hasOutput: true,
    defaultConfig: { batchId: "", productId: "" },
    fields: [
      { kind: "source-select", name: "batchId", label: "Batch", source: "batches" },
      {
        kind: "product-select",
        name: "productId",
        label: "Product for the video",
        description: "Designs and mock-ups are made for the whole batch. The video is made for this one product.",
      },
    ],
  },
  "prompt-synthesis": {
    type: "prompt-synthesis",
    label: "Prompt synthesis",
    description: "Combine a design template and art style into a design prompt.",
    icon: TextCursorInput,
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
        description: "Not used for products with their own image prompt.",
      },
      {
        kind: "source-select",
        name: "stylePresetId",
        label: "Art style",
        source: "style-presets",
        optional: true,
        noneLabel: "No style",
        description: "Not used for products with their own image prompt: the prompt sets the style.",
      },
      {
        kind: "textarea",
        name: "instructions",
        label: "Extra instructions",
        placeholder: "Anything the prompt should always include or avoid.",
        description: "Added to every design prompt this step writes.",
        maxLength: 500,
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
    defaultConfig: { imageProvider: "gemini", variants: 2, aspectRatio: "1:1" },
    fields: [
      {
        kind: "select",
        name: "imageProvider",
        label: "Image model",
        display: "cards",
        options: [
          {
            value: "gemini",
            label: "Gemini (Nano Banana 2)",
            description: "About $0.067 per image. Fills in detail from short prompts; the white backdrop is cut out afterwards.",
          },
          {
            value: "ideogram",
            label: "Ideogram 4.0",
            description: "About $0.03 per 2K image. Draws apparel designs on a transparent background. Needs an Ideogram key with credits.",
          },
        ],
      },
      { kind: "number", name: "variants", label: "Variants per product", min: 1, max: 4 },
      { kind: "select", name: "aspectRatio", label: "Aspect ratio", options: ASPECT_RATIO_OPTIONS, display: "ratios" },
    ],
  },
  "design-approval": {
    type: "design-approval",
    label: "Design approval",
    description: "Only approved designs get mock-ups.",
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
        display: "cards",
        options: [
          { value: "manual", label: "Manual review", description: "The run pauses so you can approve or reject each design." },
          { value: "auto", label: "Approve automatically", description: "Every generated design goes straight to the mock-ups." },
        ],
      },
    ],
  },
  "apply-mockup": {
    type: "apply-mockup",
    label: "Apply mock-up",
    description: "Place approved designs onto product mock-up templates.",
    icon: Shirt,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    // Colors are chosen per template in `templateColors`; a template without any is made in its own color.
    // (Workflows saved with the old shared `garmentColors` list lose it when they load.)
    // `templateBackgrounds` holds the background color of the templates that do not keep their photo's own.
    // `mockupIds` and `artworkGroupKey` are the video's choice among the finished mock-ups, made at Mockup Approval.
    defaultConfig: { mockupTemplateIds: [], templateColors: {}, templateBackgrounds: {}, mockupIds: [], artworkGroupKey: "" },
    fields: [
      {
        kind: "mockup-selection",
        name: "mockupTemplateIds",
        templateColorsName: "templateColors",
        templateBackgroundsName: "templateBackgrounds",
        label: "Mock-up templates",
      },
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
        display: "cards",
        options: [
          { value: "manual", label: "Manual review", description: "The video waits until you approve the mock-ups it may use." },
        ],
      },
    ],
  },
  "generate-video": {
    type: "generate-video",
    label: "Generate Video",
    description: "Build a video from scenes configured individually for AI or Standard motion.",
    icon: Film,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { mode: "standard", target: "etsy", template: "auto", templateVersion: 2, outputFormat: "portrait", durationSeconds: 1, assetSelection: "automatic", selectedMockupIds: [], sceneOrder: [], sceneMotionPresets: [], standardScenes: [], textOverlay: "", standardOptions: { motionPreset: "varied", crop: "safe", transition: "none" }, fallbackToStandard: true, aiStudioMode: "direct", aiStudioLayout: "hanging_window", aiStudioSourceMockupId: null, aiStudioFrameId: null },
    fields: [
      { kind: "video-formats", name: "outputFormat", label: "Output format" },
      { kind: "textarea", name: "textOverlay", label: "Text overlay", placeholder: "Optional short caption (120 characters)" },
      { kind: "select", name: "standardOptions.transition", label: "Transition", options: [
        { value: "none", label: "None" }, { value: "fade", label: "Fade" }, { value: "swipe", label: "Swipe" },
        { value: "zoom", label: "Zoom" }, { value: "flash", label: "Flash" }, { value: "whip_pan", label: "Whip pan" }, { value: "blur", label: "Blur" },
      ] },
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

export const DEFAULT_WORKFLOW_POSITIONS: Record<string, WorkflowPosition> = {
  input: { x: 0, y: 0 },
  prompt: { x: 320, y: 0 },
  design: { x: 640, y: 0 },
  "design-approval": { x: 640, y: 320 },
  mockup: { x: 320, y: 320 },
  approval: { x: 0, y: 320 },
  video: { x: 0, y: 640 },
  review: { x: 320, y: 640 },
  export: { x: 640, y: 640 },
};

const pipelineNode = (id: string, type: WorkflowNodeType, position: WorkflowPosition) => ({
  id,
  type,
  label: WORKFLOW_NODE_DEFINITIONS[type].label,
  position,
  config: { ...WORKFLOW_NODE_DEFINITIONS[type].defaultConfig },
});

export const DEFAULT_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 2,
  nodes: [
    pipelineNode("input", "product-input", DEFAULT_WORKFLOW_POSITIONS.input),
    pipelineNode("prompt", "prompt-synthesis", DEFAULT_WORKFLOW_POSITIONS.prompt),
    pipelineNode("design", "design-image", DEFAULT_WORKFLOW_POSITIONS.design),
    pipelineNode("design-approval", "design-approval", DEFAULT_WORKFLOW_POSITIONS["design-approval"]),
    pipelineNode("mockup", "apply-mockup", DEFAULT_WORKFLOW_POSITIONS.mockup),
    pipelineNode("approval", "approval-gate", DEFAULT_WORKFLOW_POSITIONS.approval),
    pipelineNode("video", "generate-video", DEFAULT_WORKFLOW_POSITIONS.video),
    pipelineNode("review", "review-video", DEFAULT_WORKFLOW_POSITIONS.review),
    pipelineNode("export", "export-zip", DEFAULT_WORKFLOW_POSITIONS.export),
  ],
  edges: [
    { id: "input-prompt", source: "input", target: "prompt" },
    { id: "prompt-design", source: "prompt", target: "design" },
    { id: "design-design-approval", source: "design", target: "design-approval" },
    { id: "design-approval-mockup", source: "design-approval", target: "mockup" },
    { id: "mockup-approval", source: "mockup", target: "approval" },
    { id: "approval-video", source: "approval", target: "video" },
    { id: "video-review", source: "video", target: "review" },
    { id: "review-export", source: "review", target: "export" },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const STARTER_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 2,
  nodes: [pipelineNode("input", "product-input", DEFAULT_WORKFLOW_POSITIONS.input)],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};
