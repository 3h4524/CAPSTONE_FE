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
  WorkflowOption,
} from "@/types/workflow";

export const WORKFLOW_DND_MIME = "application/x-apcs-workflow-node";

export const WORKFLOW_MOCK_STORAGE_KEY = "apcs.workflows.mock";

export const DEFAULT_WORKFLOW_NAME = "Etsy POD pipeline";

export const NEW_WORKFLOW_NAME = "Untitled workflow";

const PRODUCT_TYPE_OPTIONS: WorkflowOption[] = [
  { value: "tshirt", label: "T-shirt" },
  { value: "hoodie", label: "Hoodie" },
  { value: "mug", label: "Mug" },
  { value: "poster", label: "Poster" },
  { value: "tote_bag", label: "Tote bag" },
  { value: "phone_case", label: "Phone case" },
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
  { id: "trigger", label: "Trigger", accentClassName: "bg-sky-100 text-sky-700" },
  { id: "ai", label: "AI generation", accentClassName: "bg-violet-100 text-violet-700" },
  { id: "review", label: "Review", accentClassName: "bg-amber-100 text-amber-700" },
  { id: "output", label: "Output", accentClassName: "bg-emerald-100 text-emerald-700" },
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
    defaultConfig: { batchId: "", productType: "tshirt" },
    fields: [
      { kind: "source-select", name: "batchId", label: "Batch", source: "batches" },
      { kind: "select", name: "productType", label: "Product type", options: PRODUCT_TYPE_OPTIONS },
    ],
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
    defaultConfig: { model: "leonardo", variants: 2, autoApprove: false },
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
      {
        kind: "switch",
        name: "autoApprove",
        label: "Auto-approve designs",
        description: "Skip manual review and send every variation downstream.",
      },
    ],
  },
  "approval-gate": {
    type: "approval-gate",
    label: "Approval gate",
    description: "Only approved designs continue to video and listing steps.",
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
          { value: "auto", label: "Approve automatically" },
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
    defaultConfig: { mockupTemplateIds: [] },
    fields: [{ kind: "mockup-templates", name: "mockupTemplateIds", label: "Mock-up templates" }],
  },
  "generate-video": {
    type: "generate-video",
    label: "Promo video",
    description: "Render a 15–30 second promotional video from the mock-ups.",
    icon: Film,
    category: "ai",
    hasInput: true,
    hasOutput: true,
    defaultConfig: { template: "slideshow", durationSeconds: 20, withMusic: true },
    fields: [
      {
        kind: "select",
        name: "template",
        label: "Video template",
        options: [
          { value: "slideshow", label: "Slideshow" },
          { value: "showcase", label: "Showcase" },
          { value: "lifestyle-reel", label: "Lifestyle reel" },
          { value: "vertical-story", label: "Vertical story 9:16" },
        ],
      },
      { kind: "number", name: "durationSeconds", label: "Duration", min: 15, max: 30, unit: "s" },
      {
        kind: "switch",
        name: "withMusic",
        label: "Background music",
        description: "Add a royalty-free track from the music library.",
      },
    ],
  },
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
    defaultConfig: { includeVideo: true, includeListingCsv: true },
    fields: [
      {
        kind: "switch",
        name: "includeVideo",
        label: "Include videos",
        description: "Add the rendered promo videos to the package.",
      },
      {
        kind: "switch",
        name: "includeListingCsv",
        label: "Include listing CSV",
        description: "Add a CSV with titles, tags and descriptions.",
      },
    ],
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

const DEFAULT_ROW_GAP = 150;

const DEFAULT_BRANCH_OFFSET = 130;

const pipelineNode = (id: string, type: WorkflowNodeType, row: number, branch = 0) => ({
  id,
  type,
  label: WORKFLOW_NODE_DEFINITIONS[type].label,
  position: { x: branch * DEFAULT_BRANCH_OFFSET, y: row * DEFAULT_ROW_GAP },
  config: { ...WORKFLOW_NODE_DEFINITIONS[type].defaultConfig },
});

export const DEFAULT_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 1,
  nodes: [
    pipelineNode("input", "product-input", 0),
    pipelineNode("prompt", "prompt-synthesis", 1),
    pipelineNode("design", "design-image", 2),
    pipelineNode("approval", "approval-gate", 3),
    pipelineNode("mockup", "apply-mockup", 4),
    pipelineNode("video", "generate-video", 5, -1),
    pipelineNode("listing", "generate-listing", 5, 1),
    pipelineNode("export", "export-zip", 6),
  ],
  edges: [
    { id: "input-prompt", source: "input", target: "prompt" },
    { id: "prompt-design", source: "prompt", target: "design" },
    { id: "design-approval", source: "design", target: "approval" },
    { id: "approval-mockup", source: "approval", target: "mockup" },
    { id: "mockup-video", source: "mockup", target: "video" },
    { id: "mockup-listing", source: "mockup", target: "listing" },
    { id: "video-export", source: "video", target: "export" },
    { id: "listing-export", source: "listing", target: "export" },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const STARTER_WORKFLOW_DEFINITION: WorkflowDefinition = {
  version: 1,
  nodes: [pipelineNode("input", "product-input", 0)],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};
