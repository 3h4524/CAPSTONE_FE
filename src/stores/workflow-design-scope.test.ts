import { beforeEach, describe, expect, it } from "vitest";

import { sharedGraphNodes, useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowDetail, buildWorkflowNode } from "@/test/factories";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";

const initialState = useWorkflowStore.getState();

const shared: WorkflowNodeConfig = { mode: "standard", durationSeconds: 6, outputFormat: "portrait" };
const designs: WorkflowNodeConfig = { mode: "standard", durationSeconds: 10, outputFormat: "square" };
const design = { key: "p1:d1", productId: "p1", artworkGroupKey: "d1", label: "Tee · Design 2", runId: null };

const video = (config: WorkflowNodeConfig): WorkflowNode =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });
const input = buildWorkflowNode({ id: "input", data: { type: "product-input", label: "Product input", config: {}, status: "idle" } });

const configOfVideo = () => useWorkflowStore.getState().nodes.find((node) => node.id === "video")!.data.config;

describe("design scope", () => {
  beforeEach(() => {
    useWorkflowStore.setState(initialState, true);
    const nodes = [input, video(shared)];
    useWorkflowStore.setState({ nodes, edges: [], savedGraph: { nodes, edges: [] }, isDirty: false });
  });

  it("shows the design's settings on Generate Video without counting them as a workflow change", () => {
    useWorkflowStore.getState().enterDesignScope(design, designs);

    expect(configOfVideo()).toEqual(designs);
    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().designScope).toMatchObject({ key: "p1:d1", nodeId: "video", sharedConfig: shared });
  });

  it("marks an edit of the design as unsaved until it is stored for the design", () => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(design, designs);
    store.updateNodeConfig("video", { ...designs, durationSeconds: 12 });
    expect(useWorkflowStore.getState().isDirty).toBe(true);

    useWorkflowStore.getState().markDesignSaved({ ...designs, durationSeconds: 12 });

    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().designScope?.baseConfig).toMatchObject({ durationSeconds: 12 });
  });

  it("puts the shared settings back when the design is left, edits of the design discarded", () => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(design, designs);
    store.updateNodeConfig("video", { ...designs, durationSeconds: 12 });

    useWorkflowStore.getState().leaveDesignScope();

    expect(configOfVideo()).toEqual(shared);
    expect(useWorkflowStore.getState().designScope).toBeNull();
    expect(useWorkflowStore.getState().isDirty).toBe(false);
  });

  it("keeps the workflow's own unsaved changes across a visit to a design", () => {
    const store = useWorkflowStore.getState();
    store.updateNodeConfig("video", { ...shared, durationSeconds: 8 });
    store.enterDesignScope(design, designs);
    useWorkflowStore.getState().leaveDesignScope();

    expect(configOfVideo()).toMatchObject({ durationSeconds: 8 });
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });

  it("switches from one design to another without losing the shared settings", () => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(design, designs);
    store.enterDesignScope({ ...design, key: "p1:d2", artworkGroupKey: "d2" }, shared);
    useWorkflowStore.getState().leaveDesignScope();

    expect(configOfVideo()).toEqual(shared);
  });

  it("gives Save the shared settings while a design is shown", () => {
    useWorkflowStore.getState().enterDesignScope(design, designs);

    const saved = sharedGraphNodes(useWorkflowStore.getState()).find((node) => node.id === "video")!;
    expect(saved.data.config).toEqual(shared);
  });

  it("after the workflow is saved, keeps the design's unsaved changes unsaved", () => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(design, designs);
    store.updateNodeConfig("video", { ...designs, durationSeconds: 12 });

    useWorkflowStore.getState().markSaved(buildWorkflowDetail({ revision: 9 }));

    expect(useWorkflowStore.getState().isDirty).toBe(true);
    useWorkflowStore.getState().leaveDesignScope();
    expect(useWorkflowStore.getState().isDirty).toBe(false);
  });

  it("is dropped when another workflow is loaded", () => {
    useWorkflowStore.getState().enterDesignScope(design, designs);
    useWorkflowStore.getState().loadWorkflow(buildWorkflowDetail());
    expect(useWorkflowStore.getState().designScope).toBeNull();
  });
});
