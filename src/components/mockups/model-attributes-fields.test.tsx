import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { GenerateModelPhotoDialog } from "@/components/mockups/generate-model-photo-dialog";
import {
  ModelAttributesFields,
  ModelPhotoFilterBar,
} from "@/components/mockups/model-attributes-fields";
import {
  cleanAttributes,
  filterParams,
  isCompleteAttributes,
  modelAttributesLabel,
} from "@/helpers/model-attributes";
import type { ModelAttributes, ModelPhotoFilter } from "@/types/mockup-templates";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({ generate: vi.fn(), printWithoutAi: false }));

vi.mock("@/hooks/queries/use-print-without-ai", () => ({ usePrintWithoutAi: () => mocks.printWithoutAi }));
vi.mock("@/hooks/mutations/use-model-photo-mutations", () => ({
  useGenerateModelPhoto: () => ({ mutate: mocks.generate, isPending: false }),
}));

describe("model attributes", () => {
  it("label who is in a photo", () => {
    expect(modelAttributesLabel({ people: "single", ageGroup: "teen", gender: "female" })).toBe(
      "Teen · Female"
    );
    expect(modelAttributesLabel({ people: "group", groupType: "couple" })).toBe("Couple");
    expect(modelAttributesLabel(null)).toBeNull();
  });

  it("are complete with an age group and gender for one person, a kind for a group", () => {
    expect(isCompleteAttributes({ people: "single", ageGroup: "adult", gender: "male" })).toBe(
      true
    );
    expect(isCompleteAttributes({ people: "single", ageGroup: "adult" })).toBe(false);
    expect(isCompleteAttributes({ people: "group", groupType: "family" })).toBe(true);
    expect(isCompleteAttributes({ people: "group" })).toBe(false);
  });

  it("keep only what applies, and only set parts become query fields", () => {
    expect(
      cleanAttributes({ people: "group", ageGroup: "adult", gender: "male", groupType: "friends" })
    ).toEqual({ people: "group", groupType: "friends" });
    expect(filterParams({ people: "single", ageGroup: null, gender: "female" })).toEqual({
      people: "single",
      gender: "female",
    });
  });
});

const Fields = ({ onChange }: { onChange: (value: ModelAttributes) => void }) => {
  const [value, setValue] = useState<ModelAttributes>({
    people: "single",
    ageGroup: "adult",
    gender: "male",
  });
  return (
    <ModelAttributesFields
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

const Filter = ({ onChange }: { onChange: (value: ModelPhotoFilter) => void }) => {
  const [value, setValue] = useState<ModelPhotoFilter>({});
  return (
    <ModelPhotoFilterBar
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

describe("ModelAttributesFields", () => {
  it("asks for a group's kind instead of an age group and gender when several people are chosen", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Fields onChange={onChange} />);

    expect(screen.getByRole("group", { name: "Age group" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Several people" }));
    await user.click(screen.getByRole("button", { name: "Family" }));

    expect(screen.queryByRole("group", { name: "Age group" })).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ people: "group", groupType: "family" });
  });
});

describe("ModelPhotoFilterBar", () => {
  it("narrows to one person of an age group, and clears it with All", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Filter onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "One person" }));
    await user.click(screen.getByRole("button", { name: "Child" }));
    expect(onChange).toHaveBeenLastCalledWith({ people: "single", ageGroup: "child" });

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenLastCalledWith({});
    expect(screen.queryByRole("group", { name: "Age group" })).not.toBeInTheDocument();
  });
});

describe("GenerateModelPhotoDialog", () => {
  it("makes a photo of the people chosen once they are fully described", async () => {
    const user = userEvent.setup();
    render(
      <GenerateModelPhotoDialog
        open
        scope="seller"
        initial={{ people: "single", ageGroup: "senior" }}
        onClose={vi.fn()}
      />
    );

    const make = screen.getByRole("button", { name: /make photo/i });
    expect(make).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Female" }));
    await user.click(make);

    expect(mocks.generate).toHaveBeenCalledWith(
      {
        productType: "tshirt",
        attributes: { people: "single", ageGroup: "senior", gender: "female" },
        style: { scene: "studio_grey", outfit: "casual", pose: "standing" },
      },
      expect.anything()
    );
  });

  it("sends the scene, outfit and pose chosen", async () => {
    mocks.generate.mockClear();
    const user = userEvent.setup();
    render(
      <GenerateModelPhotoDialog
        open
        scope="seller"
        productType="hoodie"
        initial={{ people: "single", ageGroup: "adult", gender: "male" }}
        onClose={vi.fn()}
      />
    );

    const pick = async (menu: string, option: string) => {
      await user.click(screen.getByRole("combobox", { name: menu }));
      await user.click(screen.getByRole("option", { name: option }));
    };
    await pick("Scene", "Café");
    await pick("Outfit", "Streetwear");
    await pick("Pose", "Seated");
    expect(screen.queryByText(/real places take a little longer/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /make photo/i }));

    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        productType: "hoodie",
        style: { scene: "cafe", outfit: "streetwear", pose: "seated" },
      }),
      expect.anything()
    );
  });

  it("says a real place takes longer only while the garment is found on the photo", async () => {
    mocks.printWithoutAi = true;
    const user = userEvent.setup();
    render(
      <GenerateModelPhotoDialog
        open
        scope="seller"
        initial={{ people: "single", ageGroup: "adult", gender: "male" }}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("combobox", { name: "Scene" }));
    await user.click(screen.getByRole("option", { name: "Café" }));

    expect(screen.getByText(/real places take a little longer/i)).toBeInTheDocument();
    mocks.printWithoutAi = false;
  });

  it("offers only what a person can wear or carry, and a group only standing or walking", async () => {
    const user = userEvent.setup();
    render(
      <GenerateModelPhotoDialog
        open
        scope="seller"
        productType="mug"
        initial={{ people: "single", ageGroup: "adult", gender: "male" }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("combobox", { name: /product type/i })).toHaveTextContent("T-shirt");
    await user.click(screen.getByRole("combobox", { name: /product type/i }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["T-shirt", "Hoodie"]);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Pose" }));
    await user.click(screen.getByRole("option", { name: "Seated" }));
    await user.click(screen.getByRole("button", { name: "Several people" }));

    expect(screen.getByRole("combobox", { name: "Pose" })).toHaveTextContent("Standing");
    await user.click(screen.getByRole("combobox", { name: "Pose" }));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Standing", "Walking"]);
  });
});
