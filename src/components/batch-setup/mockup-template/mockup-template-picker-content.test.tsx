import { describe, expect, it, vi } from "vitest";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { buildMockupTemplate } from "@/test/factories";
import type { MockupTemplatePrintify } from "@/types/mockup-templates";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/mockups/mockup-template-form-dialog", () => ({ MockupTemplateFormDialog: () => null }));
vi.mock("@/components/batch-setup/mockup-template/mockup-template-detail", () => ({ MockupTemplateDetail: () => null }));

const printify = (blueprintId: number): MockupTemplatePrintify => ({
  blueprintId,
  blueprintTitle: `Blueprint ${blueprintId}`,
  printProviderId: 1,
  printProviderTitle: "Provider",
  defaultSizes: ["M"],
  colors: [{ name: "White", hex: "#FFFFFF" }],
});

const shirt = buildMockupTemplate({ id: "shirt", name: "Bella Canvas 3001", productType: "tshirt", printify: printify(1) });
const otherShirt = buildMockupTemplate({ id: "other-shirt", name: "Gildan 5000", productType: "tshirt", printify: printify(2) });
const hoodie = buildMockupTemplate({ id: "hoodie", name: "Gildan 18500", productType: "hoodie", printify: printify(3) });

const renderPicker = (onApply = vi.fn()) => {
  render(
    <MockupTemplatePickerContent
      templates={[shirt, otherShirt, hoodie]}
      initialIds={[]}
      pending={false}
      productTypeCounts={{ tshirt: 1, hoodie: 1 }}
      onApply={onApply}
      onClose={vi.fn()}
      printifyOnly
    />
  );
  return onApply;
};

describe("MockupTemplatePickerContent for Printify", () => {
  it("takes one template for each product type", async () => {
    const onApply = renderPicker();

    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));
    await userEvent.click(screen.getByRole("checkbox", { name: hoodie.name }));
    await userEvent.click(screen.getByRole("button", { name: "Apply mock-ups" }));

    expect(onApply.mock.calls[0][0]).toEqual(["shirt", "hoodie"]);
  });

  it("replaces the template of the same type and keeps the other type", async () => {
    const onApply = renderPicker();

    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));
    await userEvent.click(screen.getByRole("checkbox", { name: hoodie.name }));
    await userEvent.click(screen.getByRole("checkbox", { name: otherShirt.name }));
    await userEvent.click(screen.getByRole("button", { name: "Apply mock-ups" }));

    expect(onApply.mock.calls[0][0]).toEqual(["hoodie", "other-shirt"]);
  });

  it("says which product type has no template yet", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));

    expect(screen.getByText(/You have not chosen a mock-up template for Hoodie/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: hoodie.name }));

    expect(screen.queryByText(/You have not chosen a mock-up template/)).not.toBeInTheDocument();
  });
});
