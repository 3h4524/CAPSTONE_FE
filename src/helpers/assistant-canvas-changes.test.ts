import { describe, expect, it } from "vitest";

import { describeCanvasChange } from "@/helpers/assistant-canvas-changes";
import { buildWorkflowNode } from "@/test/factories";
import type { WorkflowNode, WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

const node = (id: string, type: WorkflowNodeType, label: string, config: WorkflowNodeConfig): WorkflowNode =>
  buildWorkflowNode({ id, data: { type, label, config, status: "idle" } });

describe("describeCanvasChange", () => {
  it("shows the old and new value of a select using the option labels", () => {
    const listing = node("l", "generate-listing", "Listing", { model: "gpt-4o", tone: "friendly" });

    const change = describeCanvasChange({ op: "update_config", nodeId: "l", config: { model: "gemini", tone: "playful" } }, [listing]);

    expect(change.title).toBe('Change settings of "Listing"');
    expect(change.details).toEqual(["Language model: GPT-4o → Gemini", "Tone: Friendly → Playful"]);
  });

  it("formats numbers and switches", () => {
    const design = node("d", "design-image", "Design", { variants: 2 });
    const listing = node("l", "generate-listing", "Listing", { includeSeoScore: true });

    expect(describeCanvasChange({ op: "update_config", nodeId: "d", config: { variants: 4 } }, [design]).details).toEqual(["Variants per product: 2 → 4"]);
    expect(describeCanvasChange({ op: "update_config", nodeId: "l", config: { includeSeoScore: false } }, [listing]).details).toEqual(["SEO score: On → Off"]);
  });

  it("describes nested settings by their dotted field name", () => {
    const video = node("v", "generate-video", "Video", { standardOptions: { transition: "none" } });

    const change = describeCanvasChange({ op: "update_config", nodeId: "v", config: { standardOptions: { transition: "fade" } } }, [video]);

    expect(change.details).toEqual(["Transition: None → Fade"]);
  });

  it("says a value was not set before", () => {
    const prompt = node("p", "prompt-synthesis", "Prompt", {});

    const change = describeCanvasChange({ op: "update_config", nodeId: "p", config: { instructions: "Avoid text" } }, [prompt]);

    expect(change.details).toEqual(['Extra instructions: not set → "Avoid text"']);
  });

  it("shortens ids and clips long text", () => {
    const prompt = node("p", "prompt-synthesis", "Prompt", {});
    const id = "11111111-2222-3333-4444-555555555555";

    const change = describeCanvasChange(
      { op: "update_config", nodeId: "p", config: { designTemplateId: id, instructions: "x".repeat(200) } },
      [prompt]
    );

    expect(change.details[0]).toBe("Design template: not set → item 11111111…");
    expect(change.details[1]?.length).toBeLessThan(110);
  });

  it("names the clearing choice of an optional source", () => {
    const prompt = node("p", "prompt-synthesis", "Prompt", { stylePresetId: "11111111-2222-3333-4444-555555555555" });

    const change = describeCanvasChange({ op: "update_config", nodeId: "p", config: { stylePresetId: "" } }, [prompt]);

    expect(change.details).toEqual(["Art style: item 11111111… → No style"]);
  });

  it("counts mockup templates", () => {
    const mockup = node("m", "apply-mockup", "Mockup", { mockupTemplateIds: ["a"] });

    const change = describeCanvasChange({ op: "update_config", nodeId: "m", config: { mockupTemplateIds: ["a", "b", "c"] } }, [mockup]);

    expect(change.details).toEqual(["Mock-up templates: 1 template → 3 templates"]);
  });

  it("falls back to the key for settings it does not know", () => {
    const listing = node("l", "generate-listing", "Listing", {});

    const change = describeCanvasChange({ op: "update_config", nodeId: "l", config: { unknownKey: 5 } }, [listing]);

    expect(change.details).toEqual(["unknownKey: not set → 5"]);
  });

  it("has no details for structural operations", () => {
    const a = node("a", "product-input", "Input", {});
    const b = node("b", "apply-mockup", "Mockup", {});

    const change = describeCanvasChange({ op: "connect", source: "a", target: "b" }, [a, b]);

    expect(change).toEqual({ title: 'Connect "Input" → "Mockup"', details: [] });
  });

  it("names a node that is added in the same proposal instead of showing its temporary id", () => {
    const input = node("a", "product-input", "Input", {});
    const operations = [
      { op: "add_node" as const, ref: "n_ps", type: "prompt-synthesis" as const },
      { op: "add_node" as const, ref: "n_x", type: "design-image" as const, label: "My designs" },
      { op: "connect" as const, source: "a", target: "n_ps" },
      { op: "connect" as const, source: "n_ps", target: "n_x" },
    ];

    const titles = operations.map((operation) => describeCanvasChange(operation, [input], operations).title);

    expect(titles[2]).toBe('Connect "Input" → "Prompt synthesis"');
    expect(titles[3]).toBe('Connect "Prompt synthesis" → "My designs"');
  });

  it("falls back to the id only when it is unknown everywhere", () => {
    expect(describeCanvasChange({ op: "connect", source: "ghost", target: "other" }, [], []).title).toBe('Connect "ghost" → "other"');
  });
});
