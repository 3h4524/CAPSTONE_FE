import { describe, expect, it, vi } from "vitest";

import { TestReportRunDialog } from "@/components/admin/test-reports/run-dialog";
import { fireEvent, render, screen } from "@testing-library/react";

describe("TestReportRunDialog", () => {
  it("renders with headless mode selected by default and allows choosing other modes", () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <TestReportRunDialog
        open={true}
        onOpenChange={handleOpenChange}
        isPending={false}
        onConfirm={handleConfirm}
      />
    );

    const headlessRadio = screen.getByRole("radio", { name: /headless/i });
    const headedRadio = screen.getByRole("radio", { name: /headed/i });
    const debugRadio = screen.getByRole("radio", { name: /debug/i });

    expect(headlessRadio).toBeInTheDocument();
    expect(headedRadio).toBeInTheDocument();
    expect(debugRadio).toBeInTheDocument();
    expect(headlessRadio).toHaveAttribute("data-state", "checked");

    fireEvent.click(headedRadio);
    expect(headedRadio).toHaveAttribute("data-state", "checked");

    const confirmButton = screen.getByRole("button", { name: /run the suite|chạy bộ kiểm thử/i });
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledWith("headed");
  });

  it("passes debug mode when debug option is chosen", () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <TestReportRunDialog
        open={true}
        onOpenChange={handleOpenChange}
        isPending={false}
        onConfirm={handleConfirm}
      />
    );

    const debugRadio = screen.getByRole("radio", { name: /debug/i });
    fireEvent.click(debugRadio);

    const confirmButton = screen.getByRole("button", { name: /run the suite|chạy bộ kiểm thử/i });
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledWith("debug");
  });

  it("handles cancel button click", () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <TestReportRunDialog
        open={true}
        onOpenChange={handleOpenChange}
        isPending={false}
        onConfirm={handleConfirm}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel|hủy/i });
    fireEvent.click(cancelButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});
