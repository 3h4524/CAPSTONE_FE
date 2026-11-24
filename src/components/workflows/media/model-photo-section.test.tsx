import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotoSection } from "@/components/workflows/media/model-photo-section";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ printWithoutAi: false }));

vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => mocks.printWithoutAi }));
vi.mock("@/hooks/queries/use-mockup-assets", () => ({ useMockupAssets: () => ({ data: [] }) }));
vi.mock("@/hooks/use-workflow-runtime", () => ({ useWorkflowRuntime: () => ({ run: { productId: "product-1" } }) }));
vi.mock("@/components/workflows/media/mockup-card", () => ({ MockupCard: () => null }));
vi.mock("@/components/workflows/media/lifestyle-mockup-form", () => ({
  LifestyleMockupForm: () => <p>AI form</p>,
  lifestyleGarmentsOf: () => [],
}));
vi.mock("@/components/workflows/media/model-photo-mockup-form", () => ({
  ModelPhotoMockupForm: () => <p>form without AI</p>,
}));

describe("ModelPhotoSection", () => {
  beforeEach(() => {
    mocks.printWithoutAi = false;
  });

  it("offers the AI form while printing without AI is off", () => {
    render(<ModelPhotoSection />);

    expect(screen.getByText("AI form")).toBeInTheDocument();
    expect(screen.queryByText("form without AI")).not.toBeInTheDocument();
  });

  it("offers the form without AI when it is on", () => {
    mocks.printWithoutAi = true;
    render(<ModelPhotoSection />);

    expect(screen.getByText("form without AI")).toBeInTheDocument();
    expect(screen.queryByText("AI form")).not.toBeInTheDocument();
  });
});
