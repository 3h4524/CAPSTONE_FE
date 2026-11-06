import { describe, expect, it } from "vitest";

import { ASSISTANT_TOOL_LABELS } from "@/constants/assistant";
import { summariseToolActivity } from "@/helpers/assistant-tool-activity";
import type { AssistantToolActivity } from "@/types/assistant";

const call = (name: string, status: AssistantToolActivity["status"], callId = name): AssistantToolActivity => ({ callId, name, status });

describe("summariseToolActivity", () => {
  it("uses the present tense while a tool runs and the past tense once it is done", () => {
    expect(summariseToolActivity([call("get_node_catalog", "running")])[0]?.label).toBe("Checking step settings");
    expect(summariseToolActivity([call("get_node_catalog", "ok")])[0]?.label).toBe("Checked step settings");
  });

  it("never shows a raw tool name, even for an unknown tool", () => {
    const [step] = summariseToolActivity([call("brand_new_tool", "ok")]);

    expect(step?.label).toBe("Done");
    expect(step?.label).not.toContain("brand_new_tool");
  });

  it("shows each kind of tool once however many times it was called", () => {
    const steps = summariseToolActivity([call("search_faq", "ok", "a"), call("search_faq", "ok", "b"), call("list_workflows", "ok")]);

    expect(steps.map((step) => step.key)).toEqual(["search_faq", "list_workflows"]);
  });

  it("is running while any call of that tool is still running, and failed when one failed", () => {
    expect(summariseToolActivity([call("search_faq", "ok", "a"), call("search_faq", "running", "b")])[0]?.status).toBe("running");
    expect(summariseToolActivity([call("search_faq", "ok", "a"), call("search_faq", "failed", "b")])[0]?.status).toBe("failed");
  });

  it("has a friendly label for every tool the backend can call", () => {
    const backendTools = [
      "search_faq", "list_workflows", "get_workflow", "get_workflow_run", "get_workflow_capabilities", "get_node_catalog",
      "list_batches", "list_batch_products", "list_design_templates", "list_style_presets", "list_mockup_templates",
      "list_video_templates", "get_usage_overview", "get_subscription_overview", "edit_workflow_canvas", "navigate",
      "start_workflow_run", "workflow_run_action", "offer_choices",
    ];

    backendTools.forEach((name) => expect(ASSISTANT_TOOL_LABELS[name], name).toBeDefined());
  });
});
