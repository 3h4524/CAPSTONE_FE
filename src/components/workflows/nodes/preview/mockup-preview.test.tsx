import { beforeEach, describe, expect, it } from "vitest";

import { MockupPreview } from "@/components/workflows/nodes/preview/mockup-preview";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobDetail } from "@/types/batch-jobs";
import type { GenerateAllMockupsResult } from "@/types/mockup-templates";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("MockupPreview", () => {
  beforeEach(() => {
    useWorkflowRunStore.getState().reset();
  });

  it("renders tabs when there are multiple design images", async () => {
    const user = userEvent.setup();

    useWorkflowRunStore.setState({
      job: {
        products: [
          {
            id: "p1",
            productName: "T-Shirt",
            images: [
              { id: "d1", imageUrl: "https://img/d1.png", variationIndex: 0 },
              { id: "d2", imageUrl: "https://img/d2.png", variationIndex: 1 },
            ],
          },
        ],
      } as unknown as BatchJobDetail,
      mockupResult: {
        images: [
          { id: "m1", designImageId: "d1", mockupImageUrl: "https://img/m1.png", garmentColor: "Black" },
          { id: "m2", designImageId: "d1", mockupImageUrl: "https://img/m2.png", garmentColor: "White" },
          { id: "m3", designImageId: "d2", mockupImageUrl: "https://img/m3.png", garmentColor: "Navy" },
        ],
      } as unknown as GenerateAllMockupsResult,
    });

    render(<MockupPreview status="success" />);

    expect(screen.getByRole("tab", { name: /Design 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Design 2/i })).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();

    const tab2 = screen.getByRole("tab", { name: /Design 2/i });
    await user.click(tab2);

    expect(screen.getByText("Navy")).toBeInTheDocument();
  });
});
