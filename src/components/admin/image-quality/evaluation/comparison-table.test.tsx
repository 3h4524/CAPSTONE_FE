import { afterEach, describe, expect, it } from "vitest";

import { ComparisonTable } from "@/components/admin/image-quality/evaluation/comparison-table";
import {
  compareImageEvalVersions,
  getDefaultImageEvalSelection,
} from "@/helpers/image-eval-comparison";
import { IMAGE_EVAL_RUN_FIXTURE } from "@/test/fixtures/image-eval-run";
import { cleanup, render, screen, within } from "@testing-library/react";

const renderReportComparison = () =>
  render(
    <ComparisonTable
      comparison={compareImageEvalVersions(
        IMAGE_EVAL_RUN_FIXTURE.images,
        IMAGE_EVAL_RUN_FIXTURE.versions,
        getDefaultImageEvalSelection(IMAGE_EVAL_RUN_FIXTURE.versions)
      )}
    />
  );

const getRow = (label: string): HTMLElement => {
  const row = screen.getByText(label).closest("tr");
  if (!row) {
    throw new Error(`No row for ${label}`);
  }
  return row;
};

describe("ComparisonTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the text result with its counts and test", () => {
    renderReportComparison();

    const row = within(getRow("Text fully correct"));
    expect(row.getByText("0/8")).toBeInTheDocument();
    expect(row.getByText("8/8")).toBeInTheDocument();
    expect(row.getByText("+100 pts")).toBeInTheDocument();
    expect(row.getByText("p < 0.001")).toBeInTheDocument();
  });

  it("reads a falling character error rate as better", () => {
    renderReportComparison();

    const row = within(getRow("Character error rate (CER)"));
    expect(row.getByText("−0.66")).toBeInTheDocument();
    expect(row.getByText("(better)")).toBeInTheDocument();
  });

  it("puts the sample size in the column headers", () => {
    renderReportComparison();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Metric",
      "Before8 images",
      "After8 images",
      "Change",
      "Test",
    ]);
  });
});
