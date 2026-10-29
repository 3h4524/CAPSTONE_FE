import { describe, expect, it } from "vitest";

import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import {
  getWorkflowNodeDefinition,
  isWorkflowNodeType,
  normalizeNodeConfig,
  readBoolean,
  readInstructionsPreview,
  readNumber,
  readString,
  readStringArray,
  sanitizeNodeLabel,
  summarizeNodeConfig,
} from "@/helpers/workflow-config";

const nodeDefinitions = Object.values(WORKFLOW_NODE_DEFINITIONS);
const nodeTypes = nodeDefinitions.map((definition) => definition.type);

describe("readString", () => {
  const cases: Array<[string, unknown, string]> = [
    ["a non-empty string", "plain text", "plain text"],
    ["an empty string", "", ""],
    ["a whitespace-only string", "   ", "   "],
    ["null", null, ""],
    ["undefined", undefined, ""],
    ["a number", 42, ""],
    ["zero", 0, ""],
    ["a boolean", true, ""],
    ["an object", { value: "x" }, ""],
    ["an array", ["x"], ""],
  ];

  it.each(cases)("reads %s as a string", (_label, value, expected) => {
    expect(readString(value)).toBe(expected);
  });
});

describe("readNumber", () => {
  const cases: Array<[string, unknown, number | undefined]> = [
    ["a positive number", 20, 20],
    ["zero", 0, 0],
    ["a negative number", -4, -4],
    ["a decimal number", 2.5, 2.5],
    ["NaN", Number.NaN, undefined],
    ["Infinity", Number.POSITIVE_INFINITY, undefined],
    ["-Infinity", Number.NEGATIVE_INFINITY, undefined],
    ["a numeric string", "20", undefined],
    ["null", null, undefined],
    ["undefined", undefined, undefined],
    ["a boolean", false, undefined],
  ];

  it.each(cases)("reads %s as a finite number or nothing", (_label, value, expected) => {
    expect(readNumber(value)).toBe(expected);
  });
});

describe("readBoolean", () => {
  const cases: Array<[string, unknown, boolean]> = [
    ["true", true, true],
    ["false", false, false],
    ["the string 'true'", "true", false],
    ["the number 1", 1, false],
    ["null", null, false],
    ["undefined", undefined, false],
    ["an object", {}, false],
  ];

  it.each(cases)("reads %s strictly", (_label, value, expected) => {
    expect(readBoolean(value)).toBe(expected);
  });
});

describe("readStringArray", () => {
  const cases: Array<[string, unknown, string[]]> = [
    ["an empty array", [], []],
    ["an array of strings", ["a", "b"], ["a", "b"]],
    ["a non-array", "abc", []],
    ["an object with a length", { 0: "a", length: 1 }, []],
    ["null", null, []],
    ["undefined", undefined, []],
  ];

  it.each(cases)("reads %s as a string array", (_label, value, expected) => {
    expect(readStringArray(value)).toEqual(expected);
  });

  it("keeps only the string entries in their original order", () => {
    expect(readStringArray(["a", 1, null, "b", undefined, {}])).toEqual(["a", "b"]);
  });
});

describe("readInstructionsPreview", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["a missing field", {}],
    ["a non-string field", { instructions: 42 }],
    ["a null field", { instructions: null }],
  ];

  it("trims the surrounding whitespace", () => {
    expect(readInstructionsPreview({ instructions: "  keep it clean  " })).toBe("keep it clean");
  });

  it("keeps the inner whitespace of a multi-line instruction", () => {
    expect(readInstructionsPreview({ instructions: "\n  a\n  b \n" })).toBe("a\n  b");
  });

  it.each(cases)("returns an empty string for %s", (_label, config) => {
    expect(readInstructionsPreview(config)).toBe("");
  });
});

describe("sanitizeNodeLabel", () => {
  it("trims and collapses repeated whitespace", () => {
    expect(sanitizeNodeLabel("  Design   image  ", "fallback")).toBe("Design image");
  });

  it("collapses inner newlines and tabs into single spaces", () => {
    expect(sanitizeNodeLabel("Design\n\timage", "fallback")).toBe("Design image");
  });

  it("returns the fallback for an empty label", () => {
    expect(sanitizeNodeLabel("", "Design image")).toBe("Design image");
  });

  it("returns the fallback for a whitespace-only label", () => {
    expect(sanitizeNodeLabel(" \t\n ", "Design image")).toBe("Design image");
  });

  it("truncates to 60 characters", () => {
    expect(sanitizeNodeLabel("x".repeat(80), "fallback")).toBe("x".repeat(60));
  });

  it("keeps a 60 character label untouched", () => {
    expect(sanitizeNodeLabel("y".repeat(60), "fallback")).toBe("y".repeat(60));
  });
});

describe("isWorkflowNodeType", () => {
  const cases: Array<[string, string]> = [
    ["an unknown node type", "unknown-node"],
    ["an empty string", ""],
    ["a differently cased node type", "Product-Input"],
    ["an inherited Object key", "toString"],
    ["a prototype key", "constructor"],
  ];

  it.each(nodeTypes)("accepts the known node type %s", (type) => {
    expect(isWorkflowNodeType(type)).toBe(true);
  });

  it.each(cases)("rejects %s", (_label, value) => {
    expect(isWorkflowNodeType(value)).toBe(false);
  });
});

describe("getWorkflowNodeDefinition", () => {
  it.each(nodeTypes)("returns the matching definition for %s", (type) => {
    const definition = getWorkflowNodeDefinition(type);

    expect(definition?.type).toBe(type);
    expect(definition?.label).toBe(WORKFLOW_NODE_DEFINITIONS[type].label);
  });

  it.each(["unknown-node", "", "toString"])("returns undefined for %s", (value) => {
    expect(getWorkflowNodeDefinition(value)).toBeUndefined();
  });
});

describe("normalizeNodeConfig", () => {
  it("keeps every declared field of the node type", () => {
    const config = { template: "showcase", durationSeconds: 25 };

    expect(normalizeNodeConfig("generate-video", config)).toEqual({
      ...WORKFLOW_NODE_DEFINITIONS["generate-video"].defaultConfig,
      ...config,
    });
  });

  it("drops fields that belong to another node type", () => {
    expect(
      normalizeNodeConfig("approval-gate", { mode: "auto", batchId: "batch-1", variants: 3 })
    ).toEqual({ mode: "auto" });
  });

  it("returns the defaults when only fields of another node type are present", () => {
    expect(normalizeNodeConfig("design-image", { batchId: "batch-1" })).toEqual(
      WORKFLOW_NODE_DEFINITIONS["design-image"].defaultConfig
    );
  });

  it("returns the defaults for an empty input", () => {
    expect(normalizeNodeConfig("product-input", {})).toEqual(
      WORKFLOW_NODE_DEFINITIONS["product-input"].defaultConfig
    );
  });

  it("keeps a field whose value is explicitly undefined", () => {
    const normalized = normalizeNodeConfig("product-input", { batchId: undefined });

    expect("batchId" in normalized).toBe(true);
    expect(normalized.batchId).toBeUndefined();
  });

  it("applies the definition defaults", () => {
    expect(normalizeNodeConfig("design-image", {})).toEqual(
      WORKFLOW_NODE_DEFINITIONS["design-image"].defaultConfig
    );
  });

  it("does not mutate the input config", () => {
    const config = { mode: "auto", batchId: "batch-1" };

    normalizeNodeConfig("approval-gate", config);

    expect(config).toEqual({ mode: "auto", batchId: "batch-1" });
  });

  it.each(nodeTypes)("keeps exactly the declared keys for %s", (type) => {
    const definition = WORKFLOW_NODE_DEFINITIONS[type];
    const fieldNames = definition.fields.map((field) => field.name.split(".")[0]);
    const everyField = Object.fromEntries(fieldNames.map((name) => [name, "value"]));
    const declaredKeys = [...new Set([...Object.keys(definition.defaultConfig), ...fieldNames])];

    expect(
      Object.keys(normalizeNodeConfig(type, { ...everyField, stray: "value" })).sort()
    ).toEqual([...declaredKeys].sort());
  });
});

describe("summarizeNodeConfig", () => {
  const videoCases: Array<[string, Record<string, unknown>, string[]]> = [
    // The total duration is added up from the scenes, so the node no longer lists it as a setting.
    ["a complete video config", { durationSeconds: 30 }, []],
    ["a missing duration", {}, []],
    ["a string duration", { durationSeconds: "30" }, []],
    ["a NaN duration", { durationSeconds: Number.NaN }, []],
  ];

  const mockupCases: Array<[string, Record<string, unknown>, string[]]> = [
    ["a selected template", { mockupTemplateIds: ["a"] }, ["1 mock-up templates"]],
    ["two selected templates", { mockupTemplateIds: ["a", "b"] }, ["2 mock-up templates"]],
    ["an empty selection", { mockupTemplateIds: [] }, ["Mock-up templates not set"]],
    ["a non-array selection", { mockupTemplateIds: "a" }, ["Mock-up templates not set"]],
    ["a missing field", {}, ["Mock-up templates not set"]],
  ];

  it("resolves select options to their labels", () => {
    expect(summarizeNodeConfig("design-image", { variants: 3, aspectRatio: "16:9" })).toEqual([
      "Variants per product: 3",
      "Aspect ratio: 16:9",
    ]);
  });

  it("skips a select whose value matches no option", () => {
    expect(summarizeNodeConfig("approval-gate", { mode: "unreviewed" })).toEqual([]);
  });

  it("skips a select whose value is missing", () => {
    expect(summarizeNodeConfig("approval-gate", {})).toEqual([]);
  });

  it.each(videoCases)("summarizes %s", (_label, config, expected) => {
    expect(summarizeNodeConfig("generate-video", config)).toEqual(expected);
  });

  it.each(mockupCases)("summarizes %s", (_label, config, expected) => {
    expect(summarizeNodeConfig("apply-mockup", config)).toEqual(expected);
  });

  it("reports an enabled switch and hides a disabled one", () => {
    expect(summarizeNodeConfig("publish-etsy", { publishImmediately: true })).toEqual([
      "Publish immediately",
    ]);
    expect(summarizeNodeConfig("publish-etsy", { publishImmediately: false })).toEqual([]);
  });

  it("reports a truthy-looking switch value as disabled", () => {
    expect(summarizeNodeConfig("publish-etsy", { publishImmediately: "true" })).toEqual([]);
  });

  it("reports a source-select with a value", () => {
    expect(summarizeNodeConfig("product-input", { batchId: "batch-1" })).toEqual([
      "Batch selected",
    ]);
  });

  it.each([
    ["an empty value", { batchId: "" }],
    ["a missing field", {}],
    ["a non-string value", { batchId: 12 }],
  ])("reports a source-select with %s as not set", (_label, config) => {
    expect(summarizeNodeConfig("product-input", config)).toEqual(["Batch not set"]);
  });

  it("never summarizes a textarea field", () => {
    expect(
      summarizeNodeConfig("prompt-synthesis", {
        designTemplateId: "template-1",
        stylePresetId: "preset-1",
        instructions: "keep it clean",
      })
    ).toEqual(["Design template selected", "Art style selected"]);
  });
});
