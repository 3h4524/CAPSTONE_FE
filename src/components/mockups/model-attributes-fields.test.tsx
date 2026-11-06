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

const mocks = vi.hoisted(() => ({ generate: vi.fn() }));

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
      },
      expect.anything()
    );
  });
});
