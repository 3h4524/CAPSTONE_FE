export const ASSISTANT_MAX_MESSAGE_LENGTH = 4000;
export const ASSISTANT_COUNTER_THRESHOLD = 3500;
export const ASSISTANT_ROUTE_MAX_LENGTH = 300;
export const ASSISTANT_CANVAS_MAX_NODES = 40;
export const ASSISTANT_NODE_CONFIG_MAX_BYTES = 8192;

export const ASSISTANT_TOOL_LABELS: Record<string, string> = {
  search_faq: "Searching help articles",
  list_workflows: "Loading your workflows",
  get_workflow: "Reading the workflow",
  get_workflow_run: "Checking the run",
  get_workflow_capabilities: "Checking available steps",
  list_batches: "Loading batches",
  list_batch_products: "Loading products",
  get_usage_overview: "Reading usage",
  get_subscription_overview: "Reading your plan",
  edit_workflow_canvas: "Preparing canvas changes",
  navigate: "Preparing a link",
  start_workflow_run: "Preparing the run",
  workflow_run_action: "Preparing the run action",
  offer_choices: "Preparing options",
};

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
