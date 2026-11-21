import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { BatchProductDialog } from "@/components/batches/batch-product-dialog";
import { type ProductFormValues, productSchema } from "@/schemas/batches";
import { zodResolver } from "@hookform/resolvers/zod";
import { act, render, renderHook, screen } from "@testing-library/react";

const emptyProduct: ProductFormValues = { name: "Trail tee", productType: "tshirt", niche: "Hikers", keywords: "trail", productDescription: "", sourceNotes: "", designText: "", customPrompt: "" };

const renderDialog = () => {
  const { result } = renderHook(() => useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: emptyProduct }));
  const form = result.current;
  const view = render(<BatchProductDialog productLine="apparel" open onOpenChange={vi.fn()} form={form} isEditing={false} isSaving={false} onSubmit={vi.fn()} />);
  const rerender = () => view.rerender(<BatchProductDialog productLine="apparel" open onOpenChange={vi.fn()} form={result.current} isEditing={false} isSaving={false} onSubmit={vi.fn()} />);
  return { form, rerender };
};

describe("BatchProductDialog", () => {
  it("marks the field the content check refused and says why under it", () => {
    const { form, rerender } = renderDialog();

    act(() => form.setError("niche", { type: "server", message: "This content was blocked by the content policy (in the niche)." }));
    rerender();

    const niche = screen.getByLabelText(/Niche/);
    expect(niche).toHaveAttribute("aria-invalid", "true");
    expect(niche).toHaveAccessibleDescription("This content was blocked by the content policy (in the niche).");
    expect(screen.getByLabelText(/Product name/)).toHaveAttribute("aria-invalid", "false");
  });

  it("shows a refusal that names no field above the buttons", () => {
    const { form, rerender } = renderDialog();

    act(() => form.setError("root.server", { type: "server", message: "Something went wrong" }));
    rerender();

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });
});
