import { describe, expect, it, vi } from "vitest";

import { AiStartFrameCropDialog } from "@/components/workflows/config-panel/fields/ai-start-frame-crop-dialog";
import type { MockupAsset, Region } from "@/types/video-workflow";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const asset = {
  id: "frame", productId: "product", sourceType: "uploaded", role: "Hero", artworkGroupKey: "group",
  variantKey: null, revision: 1, approvalStatus: "approved", approvedRevision: 1,
  width: 1200, height: 1600, previewUrl: "/mockup.png", warnings: [],
  regions: { focalPoint: null, product: null, artwork: null, detail: null },
} satisfies MockupAsset;

describe("AI start frame crop", () => {
  it("saves an in-bounds portrait crop with the selected zoom and position", async () => {
    const onSave = vi.fn();
    render(<AiStartFrameCropDialog asset={asset} sceneNumber={1} landscape={false} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByRole("slider", { name: /Zoom/ }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("slider", { name: /Horizontal position/ }), { target: { value: "1" } });
    await userEvent.click(screen.getByRole("button", { name: "Save crop" }));

    const crop = onSave.mock.calls[0]![0] as Region;
    expect(crop.x + crop.width).toBeCloseTo(1);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.y + crop.height).toBeLessThanOrEqual(1);
    expect((crop.width * asset.width) / (crop.height * asset.height)).toBeCloseTo(9 / 16);
    expect(crop.height).toBeCloseTo(0.5);
  });

  it("resets a saved crop and closes without saving when cancelled", async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<AiStartFrameCropDialog asset={asset} sceneNumber={1} landscape={false} initialCrop={{ x: 0.2, y: 0.2, width: 0.3, height: 0.4 }} onClose={onClose} onSave={onSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await userEvent.click(screen.getByRole("button", { name: "Save crop" }));
    expect(onSave).toHaveBeenCalledWith(null);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("previews the existing automatic detail crop and keeps it on reset", async () => {
    const onSave = vi.fn();
    render(<AiStartFrameCropDialog asset={asset} sceneNumber={1} landscape={false} automaticCrop={{ x: 0.2, y: 0.1, width: 0.5, height: 0.5 }} onClose={vi.fn()} onSave={onSave} />);
    expect(screen.getByRole("slider", { name: /Zoom/ })).toHaveValue("2");
    fireEvent.change(screen.getByRole("slider", { name: /Zoom/ }), { target: { value: "3" } });
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("slider", { name: /Zoom/ })).toHaveValue("2");
    await userEvent.click(screen.getByRole("button", { name: "Save crop" }));
    expect(onSave).toHaveBeenCalledWith(null);
  });
});
