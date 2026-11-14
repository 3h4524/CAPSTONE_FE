import { beforeEach, describe, expect, it, vi } from "vitest";

import { MockupTemplateFormDialog } from "@/components/mockups/mockup-template-form-dialog";
import { renderWithQuery } from "@/test/render-with-query";
import type { MockupTemplate } from "@/types/mockup-templates";
import { screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ useEntitlements: vi.fn(), previewGarmentMask: vi.fn() }));

vi.mock("@/hooks/queries/use-entitlements", () => ({ useEntitlements: mocks.useEntitlements }));
vi.mock("@/api/mockup-templates", () => ({
  mockupTemplateKeys: { all: ["mockup-templates"] },
  createMockupTemplate: vi.fn(),
  updateMockupTemplate: vi.fn(),
  setMockupTemplateView: vi.fn(),
  previewGarmentMask: mocks.previewGarmentMask,
}));
// The photo editor measures a live image; the tests are about the form around it.
vi.mock("@/components/mockups/print-area-editor", () => ({ PrintAreaEditor: () => null }));

const template = (printify: boolean): MockupTemplate =>
  ({
    id: "t-1",
    name: "Bella Tee",
    productType: "tshirt",
    baseImageUrl: "https://cdn/front.jpg",
    previewImageUrl: null,
    printAreaConfig: JSON.stringify({ x: 500, y: 500, width: 400, height: 400 }),
    outputWidthPx: 2048,
    outputHeightPx: 2048,
    usageCount: 0,
    isSystemTemplate: true,
    isMine: false,
    realisticPrintReady: true,
    allowRecolor: true,
    garmentMaskUrl: "https://cdn/mask.png",
    garmentColor: null,
    kind: "garment",
    printify: printify
      ? { blueprintId: 12, blueprintTitle: "Unisex Jersey Tee", printProviderId: 99, printProviderTitle: "Printify Choice", defaultSizes: ["M"], colors: [] }
      : null,
  }) as MockupTemplate;

describe("MockupTemplateFormDialog", () => {
  beforeEach(() => {
    mocks.useEntitlements.mockReset();
    mocks.useEntitlements.mockReturnValue({ data: { features: [{ code: "custom_mockup_templates", isEnabled: true }] } });
  });

  it("does not read a seller's plan for an admin's shared template", () => {
    renderWithQuery(<MockupTemplateFormDialog open template={template(false)} onClose={() => undefined} scope="admin" />);

    expect(mocks.useEntitlements).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Custom mock-up templates are part of Pro.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("keeps a Printify template's photo and print area as Printify's", () => {
    renderWithQuery(<MockupTemplateFormDialog open template={template(true)} onClose={() => undefined} scope="admin" />);

    expect(screen.getByText("The photo and print area stay as they are while the template is linked to Printify. Measure a side again, or unlink it, in Printify settings.")).toBeInTheDocument();
    expect(screen.queryByText("Replace photo")).not.toBeInTheDocument();
  });

  it("lets a seller replace the photo of their own template", () => {
    renderWithQuery(<MockupTemplateFormDialog open template={{ ...template(false), isSystemTemplate: false, isMine: true }} onClose={() => undefined} />);

    expect(mocks.useEntitlements).toHaveBeenCalledWith(true);
    expect(screen.getByText("Replace photo")).toBeInTheDocument();
  });
});
