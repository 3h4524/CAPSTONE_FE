import { describe, expect, it } from "vitest";

import {
  chunkText,
  findCycleNodes,
  getPredecessors,
  sampleDesignImage,
  sampleMockupImage,
} from "@/helpers/run-simulation";
import { createWorkflowNode } from "@/helpers/workflow-graph";
import type { WorkflowEdge } from "@/types/workflow";

const nodes = ["a", "b", "c", "d"].map((id) => ({ ...createWorkflowNode("design-image", { x: 0, y: 0 }), id }));
const edge = (source: string, target: string): WorkflowEdge => ({ id: `${source}-${target}`, source, target });

describe("getPredecessors", () => {
  it("lists the steps each step waits for, branches included", () => {
    expect(getPredecessors(nodes, [edge("a", "b"), edge("a", "c"), edge("b", "d"), edge("c", "d")])).toEqual({
      a: [],
      b: ["a"],
      c: ["a"],
      d: ["b", "c"],
    });
  });

  it("ignores edges to missing steps and self loops", () => {
    expect(getPredecessors(nodes, [edge("x", "a"), edge("b", "b")]).a).toEqual([]);
    expect(getPredecessors(nodes, [edge("b", "b")]).b).toEqual([]);
  });
});

describe("findCycleNodes", () => {
  it("finds no loop in a chain", () => {
    expect(findCycleNodes(getPredecessors(nodes, [edge("a", "b"), edge("b", "c")])).size).toBe(0);
  });

  it("finds a loop between steps", () => {
    expect(findCycleNodes(getPredecessors(nodes, [edge("a", "b"), edge("b", "a")])).size).toBeGreaterThan(0);
  });
});

describe("chunkText", () => {
  it("splits text into pieces that join back", () => {
    const chunks = chunkText("abcdefghij", 4);
    expect(chunks).toEqual(["abcd", "efgh", "ij"]);
    expect(chunks.join("")).toBe("abcdefghij");
  });
});

describe("sample images", () => {
  it("are inline SVGs that need no request", () => {
    expect(sampleDesignImage(28)).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(sampleMockupImage(28)).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it("differ per hue, so the preview keys stay unique", () => {
    expect(sampleDesignImage(28)).not.toBe(sampleDesignImage(200));
    expect(sampleMockupImage(28)).not.toBe(sampleDesignImage(28));
  });
});
