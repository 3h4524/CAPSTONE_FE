import { afterEach, describe, expect, it } from "vitest";

import { KeywordUse } from "@/components/batch-config/edit-design-prompt/keyword-use";
import { cleanup, render, screen } from "@testing-library/react";

describe("KeywordUse", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the motifs drawn and the keywords left out", () => {
    render(<KeywordUse motifs="coding, laptop" ignoredKeywords={["mug", "gift", "coffee"]} />);

    expect(screen.getByText("coding, laptop")).toBeTruthy();
    expect(screen.getByText("mug, gift, coffee")).toBeTruthy();
  });

  it("says nothing is drawn when no keyword is left", () => {
    render(<KeywordUse motifs="" ignoredKeywords={["gift"]} />);

    expect(screen.getByText("Nothing")).toBeTruthy();
  });

  it("shows nothing for a product with its own image prompt", () => {
    const { container } = render(<KeywordUse motifs={null} ignoredKeywords={null} />);

    expect(container.innerHTML).toBe("");
  });
});
