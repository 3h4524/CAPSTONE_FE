import { FileText } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AllowanceBanner } from "@/components/workflows/allowance-banner";
import { NodePaletteItem } from "@/components/workflows/palette/node-palette-item";
import type { Allowances } from "@/types/allowance";
import type { Entitlements } from "@/types/subscription";
import type { WorkflowNodeDefinition } from "@/types/workflow";
import { render, screen } from "@testing-library/react";

let allowances: Allowances | undefined;
let entitlements: Entitlements | undefined;

vi.mock("@/hooks/queries/use-allowances", () => ({ useAllowances: () => ({ data: allowances }) }));
vi.mock("@/hooks/queries/use-entitlements", () => ({ useEntitlements: () => ({ data: entitlements }) }));
vi.mock("@/hooks/queries/use-workflow-capabilities", () => ({ useWorkflowCapabilities: () => ({ data: undefined }) }));

const starter: Entitlements = {
  hasPlan: true,
  planName: "Starter",
  tier: "starter",
  isTrial: false,
  trialEndsAt: null,
  maxBatchSize: 20,
  maxConcurrentJobs: 1,
  prioritySupport: false,
  features: [{ code: "workflow_listing", label: "Listing content", kind: "flag", group: "Workflow", isEnabled: false, limitValue: null }],
};

const listingNode = {
  type: "generate-listing",
  category: "ai",
  label: "Listing content",
  description: "Write the SEO title, 13 tags and description for each product.",
  icon: FileText,
} as unknown as WorkflowNodeDefinition;

describe("AllowanceBanner", () => {
  beforeEach(() => {
    allowances = undefined;
  });

  it("shows what is left on Free and when it resets", () => {
    allowances = {
      scope: "free",
      resetsOn: "2026-12-01",
      mockupsPerRun: 3,
      items: [
        { code: "full_runs", label: "full runs", used: 2, limit: 2 },
        { code: "listings", label: "listings", used: 1, limit: 5 },
      ],
    };

    render(<AllowanceBanner />);

    const banner = screen.getByLabelText("Plan allowance");
    expect(banner).toHaveTextContent("Free");
    expect(banner).toHaveTextContent("0 of 2 full runs left");
    expect(banner).toHaveTextContent("4 of 5 listings left");
    expect(banner).toHaveTextContent("Up to 3 mockups per run");
    expect(banner).toHaveTextContent("Resets 1 Dec 2026");
  });

  it("shows nothing on a paid plan", () => {
    allowances = { scope: null, resetsOn: null, mockupsPerRun: null, items: [] };

    const { container } = render(<AllowanceBanner />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("NodePaletteItem", () => {
  it("locks a step the plan does not include", () => {
    entitlements = starter;

    render(<NodePaletteItem definition={listingNode} disabled={false} onAdd={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Listing content/ })).toBeDisabled();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("lets a plan with the step add it", () => {
    entitlements = { ...starter, features: [{ ...starter.features[0], isEnabled: true }] };

    render(<NodePaletteItem definition={listingNode} disabled={false} onAdd={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Listing content/ })).toBeEnabled();
  });
});
