import { describe, expect, it } from "vitest";

import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import {
  createWorkflowNode,
  getCopyName,
  getExecutionOrder,
  isConnectionAllowed,
  resolveActiveWorkflowId,
  sortWorkflowSummaries,
  toWorkflowDefinition,
  toWorkflowEdges,
  toWorkflowNodes,
  toWorkflowSummary,
  validateWorkflow,
} from "@/helpers/workflow-graph";
import {
  buildWorkflowDetail,
  buildWorkflowEdge,
  buildWorkflowNode,
  buildWorkflowSummary,
} from "@/test/factories";
import type { WorkflowDefinition, WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";
import type { Connection, Viewport } from "@xyflow/react";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const nodeTypes = Object.values(WORKFLOW_NODE_DEFINITIONS).map((definition) => definition.type);

const VALID_CONFIGS: Record<WorkflowNodeType, WorkflowNodeConfig> = {
  "product-input": { batchId: "batch-1" },
  "prompt-synthesis": {
    designTemplateId: "template-1",
    stylePresetId: "preset-1",
    instructions: "",
  },
  "design-image": { model: "leonardo", variants: 2 },
  "approval-gate": { mode: "manual" },
  "apply-mockup": { mockupTemplateIds: ["mockup-1"] },
  "generate-video": { template: "slideshow", durationSeconds: 20, withMusic: true },
  "generate-listing": { model: "gpt-4o", tone: "friendly", includeSeoScore: true },
  "export-zip": { includeVideo: true, includeListingCsv: true },
  "publish-etsy": { publishImmediately: false },
  "publish-printify": { publishImmediately: false },
};

const INVALID_CONFIGS: Array<[WorkflowNodeType, WorkflowNodeConfig, string]> = [
  ["product-input", { batchId: "" }, "Product input: Choose the batch that feeds this workflow."],
  [
    "prompt-synthesis",
    { designTemplateId: "template-1", stylePresetId: "", instructions: "" },
    "Prompt synthesis: Choose an art style.",
  ],
  [
    "prompt-synthesis",
    { designTemplateId: "template-1", stylePresetId: "preset-1", instructions: "x".repeat(501) },
    "Prompt synthesis: Keep instructions under 500 characters.",
  ],
  ["design-image", { model: "midjourney", variants: 2 }, "Design image: Choose an image model."],
  ["design-image", {}, "Design image: Choose an image model."],
  [
    "design-image",
    { model: "leonardo", variants: 9 },
    "Design image: The number of variants cannot exceed 4.",
  ],
  [
    "design-image",
    { model: "leonardo", variants: 2.5 },
    "Design image: The number of variants must be a whole number.",
  ],
  [
    "design-image",
    { model: "leonardo", variants: "2" },
    "Design image: Enter the number of variants.",
  ],
  ["approval-gate", { mode: "unreviewed" }, "Approval gate: Choose how designs are approved."],
  [
    "apply-mockup",
    { mockupTemplateIds: [] },
    "Apply mock-up: Choose at least one mock-up template.",
  ],
  [
    "apply-mockup",
    { mockupTemplateIds: ["a", "b", "c", "d", "e", "f"] },
    "Apply mock-up: Choose up to 5 mock-up templates.",
  ],
  [
    "generate-video",
    { template: "slideshow", durationSeconds: 5, withMusic: true },
    "Promo video: The video duration must be at least 15.",
  ],
  [
    "generate-listing",
    { model: "gpt-4o", tone: "friendly", includeSeoScore: "yes" },
    "Listing content: Invalid input: expected boolean, received string",
  ],
  ["export-zip", {}, "Export ZIP: Invalid input: expected boolean, received undefined"],
  [
    "publish-etsy",
    { publishImmediately: null },
    "Publish to Etsy: Invalid input: expected boolean, received null",
  ],
  ["publish-printify", {}, "Push to Printify: Invalid input: expected boolean, received undefined"],
];

const node = (id: string) => buildWorkflowNode({ id });

const edge = (source: string, target: string) =>
  buildWorkflowEdge({ id: `${source}->${target}`, source, target });

const typedNode = (id: string, type: WorkflowNodeType, config: WorkflowNodeConfig) =>
  buildWorkflowNode({
    id,
    data: { type, label: WORKFLOW_NODE_DEFINITIONS[type].label, config, status: "idle" },
  });

const PIPELINE: Array<[string, WorkflowNodeType]> = [
  ["input", "product-input"],
  ["prompt", "prompt-synthesis"],
  ["design", "design-image"],
  ["approval", "approval-gate"],
  ["mockup", "apply-mockup"],
  ["video", "generate-video"],
  ["listing", "generate-listing"],
  ["export", "export-zip"],
];

const PIPELINE_EDGES: Array<[string, string]> = [
  ["input", "prompt"],
  ["prompt", "design"],
  ["design", "approval"],
  ["approval", "mockup"],
  ["mockup", "video"],
  ["mockup", "listing"],
  ["video", "export"],
  ["listing", "export"],
];

const pipelineNodes = () => PIPELINE.map(([id, type]) => typedNode(id, type, VALID_CONFIGS[type]));

const pipelineEdges = () => PIPELINE_EDGES.map(([source, target]) => edge(source, target));

const connection = (source: string, target: string): Connection => ({
  source,
  target,
  sourceHandle: null,
  targetHandle: null,
});

const VIEWPORT: Viewport = { x: -120, y: 40, zoom: 0.75 };

describe("getExecutionOrder", () => {
  it("returns nodes in dependency order", () => {
    const nodes = [node("c"), node("a"), node("b")];
    const edges = [edge("a", "b"), edge("b", "c")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "b", "c"]);
  });

  it("starts each independent component from its own root", () => {
    const nodes = ["a", "b", "x", "y"].map(node);
    const edges = [edge("a", "b"), edge("x", "y")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "x", "b", "y"]);
  });

  it("runs every branch before the node that joins them", () => {
    const nodes = ["a", "b", "c", "d"].map(node);
    const edges = [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")];

    expect(getExecutionOrder(nodes, edges)).toEqual(["a", "b", "c", "d"]);
  });

  it("returns every node when there are no edges", () => {
    const nodes = [node("a"), node("b")];

    expect(getExecutionOrder(nodes, [])).toEqual(["a", "b"]);
  });
});

describe("isConnectionAllowed", () => {
  it("rejects a connection with an empty endpoint", () => {
    expect(isConnectionAllowed(connection("", "b"), [])).toBe(false);
  });

  it("rejects a self connection", () => {
    expect(isConnectionAllowed(connection("a", "a"), [])).toBe(false);
  });

  it("rejects a duplicate edge", () => {
    expect(isConnectionAllowed(connection("a", "b"), [edge("a", "b")])).toBe(false);
  });

  it("rejects a connection that would create a cycle", () => {
    const edges = [edge("a", "b"), edge("b", "c")];

    expect(isConnectionAllowed(connection("c", "a"), edges)).toBe(false);
  });

  it("accepts a new forward connection", () => {
    expect(isConnectionAllowed(connection("a", "b"), [edge("b", "c")])).toBe(true);
  });

  it("rejects an existing WorkflowEdge reused as a connection", () => {
    const existing = edge("a", "b");

    expect(isConnectionAllowed(existing, [existing])).toBe(false);
  });
});

describe("getCopyName", () => {
  it("appends copy when the base name is free", () => {
    expect(getCopyName("Winter drop", [])).toBe("Winter drop copy");
  });

  it("matches existing names case-insensitively", () => {
    expect(getCopyName("Winter drop", ["winter drop copy"])).toBe("Winter drop copy 2");
  });

  it("skips already taken indexes", () => {
    expect(getCopyName("Winter drop", ["Winter drop copy", "Winter drop copy 2"])).toBe(
      "Winter drop copy 3"
    );
  });
});

describe("sortWorkflowSummaries", () => {
  it("orders by most recently updated first without mutating the input", () => {
    const workflows = [
      buildWorkflowSummary({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }),
      buildWorkflowSummary({ id: "new", updatedAt: "2026-02-01T00:00:00Z" }),
    ];

    expect(sortWorkflowSummaries(workflows).map((item) => item.id)).toEqual(["new", "old"]);
    expect(workflows.map((item) => item.id)).toEqual(["old", "new"]);
  });
});

describe("resolveActiveWorkflowId", () => {
  const workflows = [
    buildWorkflowSummary({ id: "old", updatedAt: "2026-01-01T00:00:00Z" }),
    buildWorkflowSummary({ id: "new", updatedAt: "2026-02-01T00:00:00Z" }),
  ];

  it("keeps the requested id when it exists", () => {
    expect(resolveActiveWorkflowId(workflows, "old")).toBe("old");
  });

  it("falls back to the most recently updated workflow", () => {
    expect(resolveActiveWorkflowId(workflows, "missing")).toBe("new");
  });

  it("returns null when there are no workflows", () => {
    expect(resolveActiveWorkflowId([], "missing")).toBeNull();
  });

  it("falls back to the most recently updated workflow for a null requested id", () => {
    expect(resolveActiveWorkflowId(workflows, null)).toBe("new");
  });
});

describe("validateWorkflow", () => {
  it("reports no issue for a complete and connected pipeline", () => {
    expect(validateWorkflow(pipelineNodes(), pipelineEdges())).toEqual([]);
  });

  it.each(nodeTypes)("accepts a valid %s config", (type) => {
    const issues = validateWorkflow([typedNode("n1", type, VALID_CONFIGS[type])], []);

    expect(issues.filter((issue) => issue.id.startsWith("config-"))).toEqual([]);
  });

  it.each(INVALID_CONFIGS)(
    "reports the zod message for an invalid %s config",
    (type, config, message) => {
      const issues = validateWorkflow([typedNode("n1", type, config)], []);

      expect(issues.filter((issue) => issue.id === "config-n1")).toEqual([
        { id: "config-n1", nodeId: "n1", message },
      ]);
    }
  );

  it("reports both a missing input and a missing output for an empty workflow", () => {
    expect(validateWorkflow([], [])).toEqual([
      {
        id: "missing-input",
        nodeId: null,
        message: "Add a Product input node to start the workflow.",
      },
      {
        id: "missing-output",
        nodeId: null,
        message: "Add at least one output step such as Export ZIP.",
      },
    ]);
  });

  it("reports a missing output when every node is an intermediate step", () => {
    expect(
      validateWorkflow([typedNode("input", "product-input", VALID_CONFIGS["product-input"])], [])
    ).toEqual([
      {
        id: "missing-output",
        nodeId: null,
        message: "Add at least one output step such as Export ZIP.",
      },
    ]);
  });

  it("reports the second product input", () => {
    const nodes = [
      typedNode("input-1", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("input-2", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("export", "export-zip", VALID_CONFIGS["export-zip"]),
    ];
    const issues = validateWorkflow(nodes, [edge("input-1", "export")]);

    expect(issues.filter((issue) => issue.id === "extra-input-input-2")).toEqual([
      {
        id: "extra-input-input-2",
        nodeId: "input-2",
        message: "A workflow can only have one Product input.",
      },
    ]);
  });

  it("reports a node that is not connected to the product input", () => {
    const nodes = [
      typedNode("input", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("export", "export-zip", VALID_CONFIGS["export-zip"]),
    ];

    expect(validateWorkflow(nodes, [])).toEqual([
      {
        id: "unreachable-export",
        nodeId: "export",
        message: "Export ZIP is not connected to the Product input.",
      },
    ]);
  });

  it("does not report unreachable nodes when there is no product input", () => {
    const issues = validateWorkflow(
      [typedNode("export", "export-zip", VALID_CONFIGS["export-zip"])],
      []
    );

    expect(issues.map((issue) => issue.id)).toEqual(["missing-input"]);
  });

  it.each(["generate-video", "generate-listing"] as const)(
    "requires an upstream approval gate for %s",
    (type) => {
      const nodes = [
        typedNode("input", "product-input", VALID_CONFIGS["product-input"]),
        typedNode("export", "export-zip", VALID_CONFIGS["export-zip"]),
        typedNode("target", type, VALID_CONFIGS[type]),
      ];
      const issues = validateWorkflow(nodes, [edge("input", "target"), edge("target", "export")]);

      expect(issues.filter((issue) => issue.id === "approval-target")).toEqual([
        {
          id: "approval-target",
          nodeId: "target",
          message: `${WORKFLOW_NODE_DEFINITIONS[type].label} needs an Approval gate node before it.`,
        },
      ]);
    }
  );

  it("accepts an approval gate anywhere upstream", () => {
    const nodes = [
      typedNode("input", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("gate", "approval-gate", VALID_CONFIGS["approval-gate"]),
      typedNode("target", "generate-video", VALID_CONFIGS["generate-video"]),
      typedNode("export", "export-zip", VALID_CONFIGS["export-zip"]),
    ];
    const edges = [edge("input", "gate"), edge("gate", "target"), edge("target", "export")];

    expect(validateWorkflow(nodes, edges)).toEqual([]);
  });

  it("does not treat an approval gate downstream as an upstream gate", () => {
    const nodes = [
      typedNode("input", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("target", "generate-video", VALID_CONFIGS["generate-video"]),
      typedNode("gate", "approval-gate", VALID_CONFIGS["approval-gate"]),
      typedNode("export", "export-zip", VALID_CONFIGS["export-zip"]),
    ];
    const edges = [edge("input", "target"), edge("target", "gate"), edge("gate", "export")];

    expect(validateWorkflow(nodes, edges).map((issue) => issue.id)).toContain("approval-target");
  });

  it("reports every failing rule for one node at once", () => {
    const nodes = [
      typedNode("input", "product-input", VALID_CONFIGS["product-input"]),
      typedNode("target", "generate-video", { template: "slideshow", durationSeconds: 1 }),
    ];

    expect(validateWorkflow(nodes, []).map((issue) => issue.id)).toEqual([
      "missing-output",
      "unreachable-target",
      "config-target",
      "approval-target",
    ]);
  });
});

describe("createWorkflowNode", () => {
  it.each(nodeTypes)("builds a %s node from its definition", (type) => {
    const created = createWorkflowNode(type, { x: 12, y: -34 });

    expect(created).toEqual({
      id: created.id,
      type: "workflow",
      position: { x: 12, y: -34 },
      data: {
        type,
        label: WORKFLOW_NODE_DEFINITIONS[type].label,
        config: WORKFLOW_NODE_DEFINITIONS[type].defaultConfig,
        status: "idle",
      },
    });
  });

  it.each(nodeTypes)("gives every %s node a fresh v4 uuid", (type) => {
    const ids = Array.from({ length: 25 }, () => createWorkflowNode(type, { x: 0, y: 0 }).id);

    expect(new Set(ids).size).toBe(25);
    ids.forEach((id) => expect(id).toMatch(UUID_V4_PATTERN));
  });

  it("copies the default config instead of sharing the definition object", () => {
    const created = createWorkflowNode("design-image", { x: 0, y: 0 });
    const definitionConfig = WORKFLOW_NODE_DEFINITIONS["design-image"].defaultConfig;

    expect(created.data.config).toEqual(definitionConfig);
    expect(created.data.config).not.toBe(definitionConfig);
  });

  it("keeps the position it was given", () => {
    const position = { x: -5.5, y: 900.25 };

    expect(createWorkflowNode("export-zip", position).position).toEqual(position);
  });
});

describe("toWorkflowNodes", () => {
  const definition: WorkflowDefinition = {
    version: 1,
    nodes: [
      {
        id: "design",
        type: "design-image",
        label: "Design image",
        position: { x: 1, y: 2 },
        config: { model: "sdxl", variants: 4, stray: "dropped" },
      },
      {
        id: "input",
        type: "product-input",
        label: "Product input",
        position: { x: 3, y: 4 },
        config: { batchId: "batch-1" },
      },
    ],
    edges: [{ id: "input->design", source: "input", target: "design" }],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  it("maps definition nodes to xyflow nodes and normalizes their config", () => {
    expect(toWorkflowNodes(definition)).toEqual([
      {
        id: "design",
        type: "workflow",
        position: { x: 1, y: 2 },
        data: {
          type: "design-image",
          label: "Design image",
          config: { model: "sdxl", variants: 4 },
          status: "idle",
        },
      },
      {
        id: "input",
        type: "workflow",
        position: { x: 3, y: 4 },
        data: {
          type: "product-input",
          label: "Product input",
          config: { batchId: "batch-1" },
          status: "idle",
        },
      },
    ]);
  });

  it("ignores the edges and the viewport of the definition", () => {
    expect(toWorkflowNodes(definition)).toHaveLength(2);
    expect(toWorkflowNodes({ ...definition, nodes: [] })).toEqual([]);
  });

  it("keeps the definition order", () => {
    expect(toWorkflowNodes(definition).map((item) => item.id)).toEqual(["design", "input"]);
  });
});

describe("toWorkflowEdges", () => {
  it("maps definition edges to workflow edges", () => {
    expect(
      toWorkflowEdges({
        version: 1,
        nodes: [],
        edges: [
          { id: "a->b", source: "a", target: "b" },
          { id: "b->c", source: "b", target: "c" },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      })
    ).toEqual([
      { id: "a->b", source: "a", target: "b" },
      { id: "b->c", source: "b", target: "c" },
    ]);
  });

  it("returns an empty array when the definition has no edges", () => {
    expect(
      toWorkflowEdges({ version: 1, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } })
    ).toEqual([]);
  });
});

describe("toWorkflowDefinition", () => {
  it("rounds every node position and keeps the viewport", () => {
    const nodes = [
      buildWorkflowNode({ id: "input", position: { x: 10.4, y: -0.5 } }),
      buildWorkflowNode({ id: "export", position: { x: -2.6, y: 700.5 } }),
    ];

    expect(toWorkflowDefinition(nodes, [], VIEWPORT)).toEqual({
      version: 1,
      nodes: [
        {
          id: "input",
          type: "product-input",
          label: "Product input",
          position: { x: 10, y: -0 },
          config: { name: "Mug design" },
        },
        {
          id: "export",
          type: "product-input",
          label: "Product input",
          position: { x: -3, y: 701 },
          config: { name: "Mug design" },
        },
      ],
      edges: [],
      viewport: VIEWPORT,
    });
  });

  it("drops the xyflow node type and the runtime status", () => {
    const nodes = [
      buildWorkflowNode({
        id: "input",
        position: { x: 0, y: 0 },
        data: {
          type: "approval-gate",
          label: "Approval gate",
          config: { mode: "auto" },
          status: "failed",
        },
      }),
    ];
    const [definitionNode] = toWorkflowDefinition(nodes, [], VIEWPORT).nodes;

    expect(definitionNode).not.toHaveProperty("type", "workflow");
    expect(definitionNode).not.toHaveProperty("data");
    expect(definitionNode?.config).toEqual({ mode: "auto" });
  });

  it("keeps the edge endpoints and ids", () => {
    expect(toWorkflowDefinition([], [edge("a", "b"), edge("b", "c")], VIEWPORT).edges).toEqual([
      { id: "a->b", source: "a", target: "b" },
      { id: "b->c", source: "b", target: "c" },
    ]);
  });

  it("returns an empty definition for an empty canvas", () => {
    expect(toWorkflowDefinition([], [], VIEWPORT)).toEqual({
      version: 1,
      nodes: [],
      edges: [],
      viewport: VIEWPORT,
    });
  });

  it("round-trips the node identity through toWorkflowNodes", () => {
    const definition = toWorkflowDefinition(pipelineNodes(), pipelineEdges(), VIEWPORT);

    expect(toWorkflowNodes(definition).map((item) => item.id)).toEqual(
      pipelineNodes().map((item) => item.id)
    );
    expect(toWorkflowEdges(definition)).toEqual(pipelineEdges());
  });
});

describe("toWorkflowSummary", () => {
  it("projects the detail fields onto the summary shape", () => {
    const detail = buildWorkflowDetail({
      id: "workflow-9",
      name: "Autumn drop",
      description: "Warm tones only.",
      nodeCount: 7,
      updatedAt: "2026-03-02T10:00:00Z",
    });

    expect(toWorkflowSummary(detail)).toEqual({
      id: "workflow-9",
      name: "Autumn drop",
      description: "Warm tones only.",
      nodeCount: 7,
      updatedAt: "2026-03-02T10:00:00Z",
    });
  });

  it("keeps an empty description as an empty string", () => {
    expect(toWorkflowSummary(buildWorkflowDetail({ description: "" })).description).toBe("");
  });
});
