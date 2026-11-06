import type {
  ModelAgeGroup,
  ModelAttributes,
  ModelGender,
  ModelGroupType,
  ModelPeople,
  ModelPhotoFilter,
} from "@/types/mockup-templates";

export const PEOPLE_OPTIONS: { value: ModelPeople; label: string }[] = [
  { value: "single", label: "One person" },
  { value: "group", label: "Several people" },
];

export const AGE_GROUP_OPTIONS: { value: ModelAgeGroup; label: string }[] = [
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
];

export const GENDER_OPTIONS: { value: ModelGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export const GROUP_TYPE_OPTIONS: { value: ModelGroupType; label: string }[] = [
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
  { value: "couple", label: "Couple" },
];

const labelOf = <T extends string>(options: { value: T; label: string }[], value?: T | null) =>
  options.find((option) => option.value === value)?.label;

/** A short label for who is in a photo: "Adult · Female", "Family"; null when not told. */
export const modelAttributesLabel = (attributes?: ModelAttributes | null) => {
  if (!attributes) return null;
  if (attributes.people === "group")
    return labelOf(GROUP_TYPE_OPTIONS, attributes.groupType) ?? "Group";
  const parts = [
    labelOf(AGE_GROUP_OPTIONS, attributes.ageGroup),
    labelOf(GENDER_OPTIONS, attributes.gender),
  ];
  return parts.filter(Boolean).join(" · ") || "One person";
};

/** Whether the attributes say all a photo needs: an age group and gender for one person, a kind for a group. */
export const isCompleteAttributes = (attributes: ModelAttributes) =>
  attributes.people === "group"
    ? Boolean(attributes.groupType)
    : Boolean(attributes.ageGroup && attributes.gender);

/** Only the parts that apply to one person or to a group. */
export const cleanAttributes = (attributes: ModelAttributes): ModelAttributes =>
  attributes.people === "group"
    ? { people: "group", groupType: attributes.groupType ?? null }
    : {
        people: "single",
        ageGroup: attributes.ageGroup ?? null,
        gender: attributes.gender ?? null,
      };

/** A filter's parts that are set, as query or form fields. */
export const filterParams = (filter?: ModelPhotoFilter | null): Record<string, string> => {
  const params: Record<string, string> = {};
  if (!filter) return params;
  if (filter.people) params.people = filter.people;
  if (filter.ageGroup) params.ageGroup = filter.ageGroup;
  if (filter.gender) params.gender = filter.gender;
  if (filter.groupType) params.groupType = filter.groupType;
  return params;
};
