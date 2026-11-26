import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { useListingStreamStore } from "@/stores/listing-stream";
import { useWorkflowStore } from "@/stores/workflow";
import type { ListingContentResult } from "@/types/listing-content";
import type { WorkflowNode } from "@/types/workflow";
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  saved: undefined as ListingContentResult | undefined,
  queriedIds: [] as string[],
  run: null as { productId: string; nodes: { nodeType: string; output: Record<string, unknown> }[] } | null,
}));

vi.mock("@/hooks/queries/use-query", () => ({
  useQuery: ({ queryKey, enabled }: { queryKey: [string, string]; enabled: boolean }) => {
    if (enabled) state.queriedIds.push(queryKey[1]);
    return { data: enabled ? state.saved : undefined };
  },
}));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: state.run }) }));

const listing = (title: string): ListingContentResult => ({
  productId: "p1",
  listingContentId: "l1",
  title,
  description: "A cozy hoodie with a hand-drawn dog portrait.",
  tags: [
    { value: "dog portrait hoodie", type: null, position: 1 },
    { value: "custom pet name", type: null, position: 2 },
  ],
  versionNumber: 2,
  model: "gemini-3.5-flash-lite",
  createdAt: null,
});

describe("ListingPreview", () => {
  beforeEach(() => {
    state.saved = undefined;
    state.queriedIds = [];
    state.run = null;
    useListingStreamStore.setState({ order: [], products: {} });
    useWorkflowStore.setState({
      nodes: [
        { id: "input", position: { x: 0, y: 0 }, data: { type: "product-input", config: { productId: "p1" } } } as unknown as WorkflowNode,
      ],
    });
  });

  it("shows the product's saved listing when none is being written in this page", () => {
    state.saved = listing("Dog portrait custom pet hoodie featuring COOPER");
    state.run = { productId: "p1", nodes: [] };

    render(<ListingPreview />);

    expect(state.queriedIds).toContain("p1");
    expect(screen.getByText("Dog portrait custom pet hoodie featuring COOPER")).toBeInTheDocument();
    expect(screen.getByText("dog portrait hoodie")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("falls back to the listing the run's step wrote", () => {
    state.run = { productId: "p1", nodes: [{ nodeType: "generate-listing", output: { ...listing("Written by the run") } }] };

    render(<ListingPreview />);

    expect(screen.getByText("Written by the run")).toBeInTheDocument();
  });

  it("renders nothing while the product has no listing", () => {
    const { container } = render(<ListingPreview />);

    expect(container).toBeEmptyDOMElement();
  });
});
