import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";
import type { MockupTemplate } from "@/types/mockup-templates";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const photo = (id: string, name: string) =>
  ({ id, name, isMine: true, isSystemTemplate: false, kind: "model" }) as MockupTemplate;

const mocks = vi.hoisted(() => ({
  photos: [] as MockupTemplate[],
  made: null as MockupTemplate | null,
  deletePhoto: vi.fn(),
  openPopup: vi.fn(),
}));

vi.mock("@/hooks/queries/use-model-photos", () => ({
  useModelPhotos: () => ({ data: mocks.photos, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => false }));
vi.mock("@/hooks/mutations/use-model-photo-mutations", () => ({
  useDeleteModelPhoto: () => ({ mutate: mocks.deletePhoto, isPending: false }),
}));
vi.mock("@/stores/popup", () => ({
  usePopupStore: (select: (state: { openPopup: typeof mocks.openPopup }) => unknown) =>
    select({ openPopup: mocks.openPopup }),
}));
vi.mock("@/components/mockups/model-photo-form-dialog", () => ({ ModelPhotoFormDialog: () => null }));
vi.mock("@/components/mockups/mockup-template-list-item", () => ({
  MockupTemplateListItem: ({
    template,
    onDelete,
  }: {
    template: MockupTemplate;
    onDelete: (template: MockupTemplate) => void;
  }) => (
    <article aria-label={template.name}>
      <button type="button" onClick={() => onDelete(template)}>{`Delete ${template.name}`}</button>
    </article>
  ),
}));
vi.mock("@/components/mockups/generate-model-photo-dialog", () => ({
  GenerateModelPhotoDialog: ({
    onGenerated,
    onClose,
  }: {
    onGenerated: (made: MockupTemplate) => void;
    onClose: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onGenerated(mocks.made!);
        onClose();
      }}
    >
      Finish making
    </button>
  ),
}));

const makePhoto = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /make with ai/i }));
  await user.click(screen.getByRole("button", { name: "Finish making" }));
};

const cardNames = () => screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"));

describe("ModelPhotosPanel after a photo is made", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    mocks.deletePhoto.mockClear();
    mocks.openPopup.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    mocks.photos = [photo("a", "Adult · Female"), photo("b", "Adult · Male"), photo("c", "Teen · Male")];
    mocks.made = mocks.photos[2];
  });

  it("puts it first, marks it and scrolls to it", async () => {
    const user = userEvent.setup();
    render(<ModelPhotosPanel scope="seller" />);
    expect(cardNames()).toEqual(["Adult · Female", "Adult · Male", "Teen · Male"]);

    await makePhoto(user);

    expect(cardNames()).toEqual(["Teen · Male", "Adult · Female", "Adult · Male"]);
    const marked = screen.getByText("Just made").parentElement!;
    expect(within(marked).getByRole("article", { name: "Teen · Male" })).toBeInTheDocument();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(marked);
  });

  it("shows it before the list has been read again", async () => {
    mocks.made = photo("new", "Senior · Female");
    const user = userEvent.setup();
    render(<ModelPhotosPanel scope="seller" />);

    await makePhoto(user);

    expect(cardNames()[0]).toBe("Senior · Female");
    expect(cardNames()).toHaveLength(4);
  });

  it("stops marking it when the filters change", async () => {
    const user = userEvent.setup();
    render(<ModelPhotosPanel scope="seller" />);
    await makePhoto(user);

    await user.click(screen.getByRole("button", { name: "One person" }));

    expect(screen.queryByText("Just made")).not.toBeInTheDocument();
    expect(cardNames()[0]).toBe("Adult · Female");
  });

  it("does not keep showing it once it is deleted", async () => {
    mocks.made = photo("new", "Senior · Female");
    const user = userEvent.setup();
    render(<ModelPhotosPanel scope="seller" />);
    await makePhoto(user);

    await user.click(screen.getByRole("button", { name: "Delete Senior · Female" }));
    const { onPositive } = mocks.openPopup.mock.lastCall![0] as { onPositive: () => void };
    await waitFor(() => {
      onPositive();
      expect(screen.queryByRole("article", { name: "Senior · Female" })).not.toBeInTheDocument();
    });

    expect(mocks.deletePhoto).toHaveBeenCalledWith("new");
  });
});
