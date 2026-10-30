export const ASSISTANT_MAX_MESSAGE_LENGTH = 4000;
export const ASSISTANT_COUNTER_THRESHOLD = 3500;
export const ASSISTANT_SCROLL_BOTTOM_TOLERANCE_PX = 80;
export const ASSISTANT_ROUTE_MAX_LENGTH = 300;
export const ASSISTANT_CANVAS_MAX_NODES = 40;
export const ASSISTANT_NODE_CONFIG_MAX_BYTES = 8192;

export type AssistantToolLabel = { running: string; done: string };

export const ASSISTANT_TOOL_LABELS: Record<string, AssistantToolLabel> = {
  search_faq: { running: "Looking through the help articles", done: "Looked through the help articles" },
  list_workflows: { running: "Loading your workflows", done: "Loaded your workflows" },
  get_workflow: { running: "Reading the workflow", done: "Read the workflow" },
  get_workflow_run: { running: "Checking the run", done: "Checked the run" },
  get_workflow_capabilities: { running: "Checking which steps are available", done: "Checked which steps are available" },
  get_node_catalog: { running: "Checking step settings", done: "Checked step settings" },
  list_batches: { running: "Loading your batches", done: "Loaded your batches" },
  list_batch_products: { running: "Loading the products", done: "Loaded the products" },
  list_design_templates: { running: "Browsing design templates", done: "Browsed design templates" },
  list_style_presets: { running: "Browsing art styles", done: "Browsed art styles" },
  list_mockup_templates: { running: "Browsing mock-up templates", done: "Browsed mock-up templates" },
  list_video_templates: { running: "Browsing video templates", done: "Browsed video templates" },
  get_usage_overview: { running: "Reading your usage", done: "Read your usage" },
  get_subscription_overview: { running: "Reading your plan", done: "Read your plan" },
  edit_workflow_canvas: { running: "Preparing the canvas changes", done: "Prepared the canvas changes" },
  arrange_workflow_canvas: { running: "Planning a tidier layout", done: "Planned a tidier layout" },
  navigate: { running: "Preparing a link", done: "Prepared a link" },
  start_workflow_run: { running: "Preparing the run", done: "Prepared the run" },
  workflow_run_action: { running: "Preparing the action", done: "Prepared the action" },
  offer_choices: { running: "Preparing options", done: "Prepared options" },
};

export const ASSISTANT_FALLBACK_TOOL_LABEL: AssistantToolLabel = { running: "Working on it", done: "Done" };

export const ASSISTANT_STARTER_CHIPS: { match: (pathname: string) => boolean; chips: string[] }[] = [
  { match: (p) => p.startsWith("/admin"), chips: ["How do I add an FAQ article?", "How does RAG ingestion work?", "What can you help me with?"] },
  { match: (p) => p === "/workflows", chips: ["Why did my last run fail?", "Explain the selected step", "Add a listing content step", "Run this workflow"] },
  { match: (p) => p.startsWith("/batches"), chips: ["List my batches", "How do I import products from Excel?"] },
  { match: (p) => p.startsWith("/usage") || p.startsWith("/subscription"), chips: ["Summarise my usage this month", "What does my plan include?"] },
  { match: () => true, chips: ["What can you help me with?", "How do I create my first workflow?", "Show my workflows"] },
];

export const ASSISTANT_NAVIGATION_PATTERNS: RegExp[] = [
  /^\/(dashboard|workflows|batches|styles|design-templates|api-keys|usage|market-opportunities|support|subscription|profile)$/,
  /^\/workflows\?id=[0-9a-fA-F-]{36}(&run=[0-9a-fA-F-]{36})?$/,
  /^\/admin\/(dashboard|revenue|analytics|support-tickets|subscription-plans|rag-ingest|users|test-reports)$/,
];

export const ASSISTANT_LAUNCHER_SIZE_PX = 48;
export const ASSISTANT_LAUNCHER_MARGIN_PX = 8;
export const ASSISTANT_LAUNCHER_DRAG_THRESHOLD_PX = 4;
export const ASSISTANT_LAUNCHER_KEY_STEP_PX = 16;
export const ASSISTANT_LAUNCHER_STORAGE_KEY = "apcs.assistant.launcher";
export const ASSISTANT_LAUNCHER_DEFAULT_OFFSET_PX = 16;
export const ASSISTANT_LAUNCHER_WORKFLOW_BOTTOM_PX = 176;

export const ASSISTANT_PANEL_DEFAULT_WIDTH_PX = 420;
export const ASSISTANT_PANEL_MIN_WIDTH_PX = 320;
export const ASSISTANT_PANEL_MAX_WIDTH_PX = 760;
export const ASSISTANT_PANEL_RESERVED_WIDTH_PX = 480;
export const ASSISTANT_PANEL_STORAGE_KEY = "apcs.assistant.panel-width";
export const ASSISTANT_DISPLAY_MODE_STORAGE_KEY = "apcs.assistant.display-mode";
export const ASSISTANT_DOCK_ENABLED = false;
export const ASSISTANT_MASCOT_SRC = "/images/assistant/assistant-mascot.webp";
export const ASSISTANT_BUBBLE_GAP_PX = 12;

export const ASSISTANT_LAYOUT_GAPS: Record<"compact" | "comfortable" | "wide", { x: number; y: number }> = {
  compact: { x: 60, y: 40 },
  comfortable: { x: 100, y: 70 },
  wide: { x: 160, y: 110 },
};

export const ASSISTANT_LAYOUT_DEFAULT_NODE_HEIGHT_PX = 200;
