import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowDetail, buildWorkflowNode } from "@/test/factories";
import type { RunGroup } from "@/types/video-workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import { act, renderHook } from "@testing-library/react";

import { useWorkflowSave } from "./use-workflow-save";

const mocks = vi.hoisted(() => ({
  updateWorkflow: vi.fn(),
  storeConfig: vi.fn(),
  group: null as RunGroup | null,
}));

vi.mock("@xyflow/react", () => ({ useReactFlow: () => ({ getViewport: () => ({ x: 0, y: 0, zoom: 1 }) }) }));
vi.mock("@/hooks/mutations/use-update-workflow", () => ({
  useUpdateWorkflow: () => ({ mutate: mocks.updateWorkflow, isPending: false }),
}));
vi.mock("@/hooks/mutations/use-run-group-actions", () => ({
  useUpdateRunGroupDesignConfig: () => ({ mutate: mocks.storeConfig, isPending: false }),
}));
vi.mock("@/hooks/queries/use-run-group", () => ({
  useRunGroupId: () => "group-1",
  useRunGroup: () => ({ data: mocks.group }),
}));
vi.mock("@/helpers/toast", () => ({ showWorkflowActionToast: vi.fn() }));

const initialState = useWorkflowStore.getState();
const shared: WorkflowNodeConfig = { mode: "standard", durationSeconds: 6 };
const own: WorkflowNodeConfig = { mode: "standard", durationSeconds: 10 };
const product = { kind: "design" as const, key: "p1:d1", productId: "p1", artworkGroupKey: "d1", label: "June Rose Tee", runId: null };

const video = (config: WorkflowNodeConfig): WorkflowNode =>
  buildWorkflowNode({ id: "video", data: { type: "generate-video", label: "Generate Video", config, status: "idle" } });

const group = (status: RunGroup["status"]): RunGroup =>
  ({ id: "group-1", workflowId: "workflow-1", status, revision: 3, targets: [] }) as unknown as RunGroup;

const savedDefinitionConfig = () =>
  mocks.updateWorkflow.mock.calls[0][0].input.definition.nodes.find((node: { id: string }) => node.id === "video").config;

describe("useWorkflowSave with a product chosen on Generate Video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.group = group("waiting_for_targets");
    mocks.updateWorkflow.mockImplementation((_input, options) => options?.onSuccess?.(buildWorkflowDetail()));
    mocks.storeConfig.mockImplementation((_input, options) => options?.onSuccess?.(mocks.group));
    useWorkflowStore.setState(initialState, true);
    const nodes = [video(shared)];
    useWorkflowStore.setState({ workflowId: "workflow-1", nodes, edges: [], savedGraph: { nodes, edges: [] }, isDirty: false });
  });

  const edit = (config: WorkflowNodeConfig) => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(product, own);
    store.updateNodeConfig("video", config);
  };

  it("stores the edited settings for that product, then saves the workflow with the shared ones", () => {
    edit({ ...own, durationSeconds: 12 });
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(mocks.storeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group-1",
        expectedRevision: 3,
        productId: "p1",
        artworkGroupKey: "d1",
        config: expect.objectContaining({ durationSeconds: 12 }),
      }),
      expect.anything()
    );
    expect(savedDefinitionConfig()).toEqual(shared);
    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().designScope?.baseConfig).toMatchObject({ durationSeconds: 12 });
  });

  it("leaves the product alone when only the shared settings changed", () => {
    useWorkflowStore.getState().updateNodeConfig("video", { ...shared, durationSeconds: 8 });
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(mocks.storeConfig).not.toHaveBeenCalled();
    expect(mocks.updateWorkflow).toHaveBeenCalledOnce();
  });

  it("does not store once the videos started, since the group refuses changes then", () => {
    mocks.group = group("running");
    edit({ ...own, durationSeconds: 12 });
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(mocks.storeConfig).not.toHaveBeenCalled();
    expect(mocks.updateWorkflow).toHaveBeenCalledOnce();
  });

  it("keeps the workflow unsaved when the product's settings are refused", () => {
    mocks.storeConfig.mockImplementation(() => {});
    edit({ ...own, durationSeconds: 12 });
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(mocks.updateWorkflow).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().isDirty).toBe(true);
  });
});

describe("useWorkflowSave with a product of the batch chosen before a run", () => {
  const before = { kind: "product" as const, key: "product:p1", productId: "p1", artworkGroupKey: "", label: "June Rose Tee", runId: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.group = null;
    mocks.updateWorkflow.mockImplementation((_input, options) => options?.onSuccess?.(buildWorkflowDetail()));
    useWorkflowStore.setState(initialState, true);
    const nodes = [video(shared)];
    useWorkflowStore.setState({ workflowId: "workflow-1", nodes, edges: [], savedGraph: { nodes, edges: [] }, isDirty: false });
  });

  it("keeps the product's settings in the workflow, beside the shared ones", () => {
    const store = useWorkflowStore.getState();
    store.enterDesignScope(before, shared);
    store.updateNodeConfig("video", { ...shared, durationSeconds: 12 });
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(mocks.storeConfig).not.toHaveBeenCalled();
    expect(savedDefinitionConfig()).toEqual({ ...shared, productConfigs: { p1: { ...shared, durationSeconds: 12 } } });
    expect(useWorkflowStore.getState().isDirty).toBe(false);
    expect(useWorkflowStore.getState().designScope?.baseConfig).toMatchObject({ durationSeconds: 12 });
  });

  it("puts the product back on the shared settings when its settings match them again", () => {
    const withOwn = { ...shared, productConfigs: { p1: own } };
    const nodes = [video(withOwn)];
    useWorkflowStore.setState({ nodes, savedGraph: { nodes, edges: [] } });
    const store = useWorkflowStore.getState();
    store.enterDesignScope(before, own);
    store.updateNodeConfig("video", shared);
    const { result } = renderHook(() => useWorkflowSave());

    act(() => result.current.saveWorkflow());

    expect(savedDefinitionConfig()).toEqual(shared);
    expect(useWorkflowStore.getState().isDirty).toBe(false);
  });
});
