import { describe, expect, it, vi } from "vitest";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { buildMockupTemplate } from "@/test/factories";
import type { MockupTemplatePrintify } from "@/types/mockup-templates";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/mockups/mockup-template-form-dialog", () => ({ MockupTemplateFormDialog: () => null }));
vi.mock("@/components/batch-setup/mockup-template/mockup-template-detail", () => ({
  MockupTemplateDetail: ({ template, backgrounds }: { template: { name: string } | null; backgrounds?: Record<string, string> }) => (
    <p data-testid="preview">{template?.name} {Object.values(backgrounds ?? {}).join(",")}</p>
  ),
}));
vi.mock("@/components/mockups/print-area-editor", () => ({
  PrintAreaEditor: ({ onChange }: { onChange: (area: { x: number; y: number; width: number; height: number }) => void }) => (
    <button type="button" onClick={() => onChange({ x: 120, y: 130, width: 100, height: 100 })}>Move design</button>
  ),
}));

const printify = (blueprintId: number): MockupTemplatePrintify => ({
  blueprintId,
  blueprintTitle: `Blueprint ${blueprintId}`,
  printProviderId: 1,
  printProviderTitle: "Provider",
  defaultSizes: ["M"],
  colors: [{ name: "White", hex: "#FFFFFF" }, { name: "Black", hex: "#232424" }],
});

const shirt = buildMockupTemplate({
  id: "shirt",
  name: "Bella Canvas 3001",
  productType: "tshirt",
  printAreaConfig: '{"x":100,"y":100,"width":200,"height":200}',
  isSystemTemplate: true,
  isMine: false,
  allowBackground: true,
  printify: printify(1),
});
const otherShirt = buildMockupTemplate({ id: "other-shirt", name: "Gildan 5000", productType: "tshirt", printify: printify(2) });
const hoodie = buildMockupTemplate({ id: "hoodie", name: "Gildan 18500", productType: "hoodie", allowBackground: true, printify: printify(3) });

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

describe("MockupTemplatePickerContent for the ZIP", () => {
  it("tells a Printify template from a standard one", () => {
    const standard = buildMockupTemplate({ id: "standard", name: "Classic Tee", productType: "tshirt" });
    render(<MockupTemplatePickerContent templates={[shirt, standard]} initialIds={[]} pending={false} onApply={vi.fn()} onClose={vi.fn()} />);

    expect(within(screen.getByRole("checkbox", { name: shirt.name }).closest("label")!).getByText("Printify")).toBeInTheDocument();
    expect(within(screen.getByRole("checkbox", { name: standard.name }).closest("label")!).getByText("Standard mock-up")).toBeInTheDocument();
  });
});

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

  it("keeps a moved print position on the workflow and leaves a system template as it is", async () => {
    const onApply = renderPicker();
    const before = shirt.printAreaConfig;

    // The pencil beside the card, on a template not ticked yet: saving a position ticks it.
    await userEvent.click(screen.getByRole("button", { name: `Edit the mock-up on ${shirt.name}` }));
    await userEvent.click(screen.getByRole("button", { name: "Move design" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply mock-ups" }));

    expect(onApply.mock.calls[0][0]).toEqual(["shirt"]);
    expect(onApply.mock.calls[0][3]).toEqual({ shirt: { x: 120, y: 130, width: 100, height: 100, rotation: 0 } });
    expect(shirt.printAreaConfig).toBe(before);
  });

  it("sets the garment colors and each one's background in the same form", async () => {
    const onApply = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: `Edit the mock-up on ${shirt.name}` }));
    const form = within(screen.getByRole("dialog"));
    await userEvent.click(form.getByRole("button", { name: "Black" }));
    await userEvent.click(form.getByRole("button", { name: /Sage/ }));
    await userEvent.click(form.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply mock-ups" }));

    expect(onApply.mock.calls[0][1]).toEqual({ shirt: ["#FFFFFF", "#232424"] });
    expect(onApply.mock.calls[0][2]).toEqual({ shirt: { "#232424": "#DDE8DA" } });
  });

  it("keeps nothing from the form when it is cancelled", async () => {
    const onApply = renderPicker();

    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));
    await userEvent.click(screen.getByRole("button", { name: `Edit the mock-up on ${shirt.name}` }));
    const form = within(screen.getByRole("dialog"));
    await userEvent.click(form.getByRole("button", { name: "Black" }));
    await userEvent.click(form.getByRole("button", { name: "Move design" }));
    await userEvent.click(form.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply mock-ups" }));

    expect(onApply.mock.calls[0][1]).toEqual({ shirt: ["#FFFFFF"] });
    expect(onApply.mock.calls[0][3]).toEqual({});
  });

  it("does not tick a template when its form is left unsaved", async () => {
    const onApply = renderPicker();

    await userEvent.click(screen.getByRole("button", { name: `Edit the mock-up on ${shirt.name}` }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("checkbox", { name: shirt.name })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows the template whose background is being picked", async () => {
    renderPicker();
    await userEvent.click(screen.getByRole("checkbox", { name: hoodie.name }));
    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));
    expect(screen.getByTestId("preview")).toHaveTextContent(shirt.name);

    const hoodieBackground = screen.getByText(`Background for ${hoodie.name}`).parentElement!;
    await userEvent.click(within(hoodieBackground).getByRole("button", { name: /Sage/ }));

    expect(screen.getByTestId("preview")).toHaveTextContent(`${hoodie.name} #DDE8DA`);
  });

  it("says which product type has no template yet", async () => {
    renderPicker();

    await userEvent.click(screen.getByRole("checkbox", { name: shirt.name }));

    expect(screen.getByText(/You have not chosen a mock-up template for Hoodie/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: hoodie.name }));

    expect(screen.queryByText(/You have not chosen a mock-up template/)).not.toBeInTheDocument();
  });
});
