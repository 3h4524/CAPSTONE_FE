import { describe, expect, it } from "vitest";

import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
import { fireEvent,render, screen } from "@testing-library/react";

describe("ImageGridPreview", () => {
  it("renders 2 horizontal skeletons when running with no images", () => {
    const { container } = render(
      <ImageGridPreview label="Designs" images={[]} status="running" />
    );
    expect(screen.getByText("Designs")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(2);
  });

  it("renders at most 4 items in 2x2 grid and shows pagination when there are more than 4 images", () => {
    const images = [
      "https://example.com/1.png",
      "https://example.com/2.png",
      "https://example.com/3.png",
      "https://example.com/4.png",
      "https://example.com/5.png",
    ];

    render(<ImageGridPreview label="Designs" images={images} status="success" />);

    expect(screen.getByText("1/2")).toBeInTheDocument();
    const nextBtn = screen.getByLabelText("Next page");
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("opens the preview modal when clicking on an image", () => {
    const images = ["https://example.com/1.png", "https://example.com/2.png"];

    render(<ImageGridPreview label="Designs" images={images} status="success" />);

    const tiles = screen.getAllByRole("button");
    fireEvent.click(tiles[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
