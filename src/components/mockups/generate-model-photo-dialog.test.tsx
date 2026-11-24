import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerateModelPhotoDialog } from "@/components/mockups/generate-model-photo-dialog";
import type { MockupTemplate } from "@/types/mockup-templates";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type GenerateOptions = { onSuccess: () => void; onError: (error: unknown) => void };

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  isPending: false,
  onPreview: undefined as ((url: string) => void) | undefined,
  onSaved: undefined as ((photo: MockupTemplate) => void) | undefined,
}));

vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => false }));
vi.mock("@/hooks/mutations/use-model-photo-mutations", () => ({
  useGenerateModelPhoto: (
    _scope: string,
    callbacks: { onPreview: (url: string) => void; onSaved: (photo: MockupTemplate) => void }
  ) => {
    mocks.onPreview = callbacks.onPreview;
    mocks.onSaved = callbacks.onSaved;
    return { mutate: mocks.generate, isPending: mocks.isPending };
  },
}));

const LINK = "https://ideogram.ai/api/images/ephemeral/photo.png?exp=1";

const renderDialog = (onClose = vi.fn(), onGenerated = vi.fn()) => {
  render(
    <GenerateModelPhotoDialog
      open
      scope="seller"
      initial={{ people: "single", ageGroup: "adult", gender: "female" }}
      onClose={onClose}
      onGenerated={onGenerated}
    />
  );
  return { onClose, onGenerated };
};

const startAndDraw = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /make photo/i }));
  mocks.isPending = true;
  act(() => mocks.onPreview?.(LINK));
  return user;
};

const lastOptions = () => mocks.generate.mock.lastCall?.[1] as GenerateOptions;

describe("GenerateModelPhotoDialog while a photo is made", () => {
  beforeEach(() => {
    mocks.generate.mockClear();
    mocks.isPending = false;
  });

  it("shows the photo as soon as it is drawn, while it is being saved", async () => {
    renderDialog();

    await startAndDraw();

    expect(screen.getByRole("img", { name: /photo that was just made/i })).toHaveAttribute("src", LINK);
    expect(screen.getByRole("status")).toHaveTextContent(/being saved/i);
    expect(screen.queryByRole("combobox", { name: "Scene" })).not.toBeInTheDocument();
  });

  it("can be closed once the photo is drawn, and not before", async () => {
    mocks.isPending = true;
    const { onClose } = renderDialog();
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    act(() => mocks.onPreview?.(LINK));
    await user.click(screen.getByRole("button", { name: "Close and keep saving" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("hands over the saved photo and closes", async () => {
    const { onClose, onGenerated } = renderDialog();
    await startAndDraw();
    const photo = { id: "p1" } as MockupTemplate;

    act(() => {
      mocks.onSaved?.(photo);
      lastOptions().onSuccess();
    });

    expect(onGenerated).toHaveBeenCalledWith(photo);
    expect(onClose).toHaveBeenCalled();
  });

  it("goes back to the form and says why when the photo could not be saved", async () => {
    renderDialog();
    await startAndDraw();
    mocks.isPending = false;

    act(() => lastOptions().onError(new Error("The photo was made but could not be saved. Try again.")));

    expect(screen.getByRole("alert")).toHaveTextContent(/could not be saved/i);
    expect(screen.queryByRole("img", { name: /photo that was just made/i })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Scene" })).toBeInTheDocument();
  });
});
