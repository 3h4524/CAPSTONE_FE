import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListingContentResultPanel } from "@/components/workflows/config-panel/listing-content-result";
import { useWorkflowStore } from "@/stores/workflow";
import { buildWorkflowNode } from "@/test/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type Listing = { productId: string; title: string; description: string; tags: { value: string; position: number }[]; versionNumber: number; model: string };

const mocks = vi.hoisted(() => ({
  products: [] as { id: string; name: string; productType: string; status: string }[],
  listings: {} as Record<string, Listing | undefined>,
}));

vi.mock("@/hooks/queries/use-batch-products", () => ({
  useBatchProducts: () => ({ data: mocks.products, isPending: false, isError: false, refetch: vi.fn() }),
}));
// The listing of the product the query asks for, as the server would answer it.
vi.mock("@/hooks/queries/use-query", () => ({
  useQuery: ({ queryKey }: { queryKey: [string, string] }) => ({ data: mocks.listings[queryKey[1]] }),
}));
vi.mock("@/hooks/mutations/use-mutation", () => ({
  useMutation: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, data: undefined, variables: undefined }),
}));
vi.mock("@/hooks/mutations/use-workflow-run-action", () => ({ useWorkflowRunAction: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/queries/use-entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));
vi.mock("@/hooks/use-query-client", () => ({ useAppQueryClient: () => ({ setQueryData: vi.fn() }) }));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: undefined, isRunning: false }) }));
// A plain select stands in for the panel dropdown, so a test can pick an option.
vi.mock("@/components/workflows/config-panel/fields/option-select", () => ({
  OptionSelect: ({ value, onChange, options, standaloneId }: { value: string; onChange: (next: string) => void; options: { value: string; label: string }[]; standaloneId?: string }) => (
    <select id={standaloneId} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

const listing = (productId: string, title: string): Listing =>
  ({ productId, title, description: `About ${title}.`, tags: [{ value: `${title} tag`, position: 1 }], versionNumber: 1, model: "gemini" });

const input = (productId: string) => buildWorkflowNode({
  id: "input",
  data: { type: "product-input", label: "Product input", config: { batchId: "batch-1", productId }, status: "idle" },
});
const listingNode = buildWorkflowNode({ id: "listing", data: { type: "generate-listing", label: "Listing content", config: {}, status: "idle" } });

describe("ListingContentResultPanel", () => {
  beforeEach(() => {
    mocks.products = [
      { id: "tee", name: "Cat tee", productType: "tshirt", status: "completed" },
      { id: "hoodie", name: "Dog hoodie", productType: "hoodie", status: "completed" },
      { id: "mug", name: "Owl mug", productType: "mug", status: "pending" },
    ];
    mocks.listings = { tee: listing("tee", "Cat tee listing"), hoodie: listing("hoodie", "Dog hoodie listing") };
    useWorkflowStore.setState({ nodes: [input("tee"), listingNode], isRunning: false });
  });

  it("opens on the listing of the product named in Product input", () => {
    render(<ListingContentResultPanel />);

    expect(screen.getByLabelText("Product")).toHaveValue("tee");
    expect(screen.getByText("Cat tee listing")).toBeInTheDocument();
  });

  it("shows each product's own listing once another product of the batch is chosen", async () => {
    render(<ListingContentResultPanel />);

    await userEvent.selectOptions(screen.getByLabelText("Product"), "hoodie");

    expect(screen.getByText("Dog hoodie listing")).toBeInTheDocument();
    expect(screen.queryByText("Cat tee listing")).not.toBeInTheDocument();
  });

  it("says when the chosen product has no listing yet", async () => {
    render(<ListingContentResultPanel />);

    await userEvent.selectOptions(screen.getByLabelText("Product"), "mug");

    expect(screen.getByText("This product has no listing yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Generate$/ })).toBeInTheDocument();
  });

  it("starts on the batch's first product when Product input names none", () => {
    useWorkflowStore.setState({ nodes: [input(""), listingNode] });
    render(<ListingContentResultPanel />);

    expect(screen.getByText("Cat tee listing")).toBeInTheDocument();
  });

  it("offers no choice for a batch of one product", () => {
    mocks.products = mocks.products.slice(0, 1);
    render(<ListingContentResultPanel />);

    expect(screen.queryByLabelText("Product")).not.toBeInTheDocument();
    expect(screen.getByText("Cat tee listing")).toBeInTheDocument();
  });
});
