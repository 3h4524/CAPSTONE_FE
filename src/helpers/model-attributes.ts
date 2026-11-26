import { i18n } from "@/i18n/client";
import type {
  ModelAgeGroup,
  ModelAttributes,
  ModelGender,
  ModelGroupType,
  ModelPeople,
  ModelPhotoFilter,
} from "@/types/mockup-templates";

// The label is read when it is shown, so it follows the language chosen at that time.
const translatedOption = <T extends string>(value: T, key: string) => ({
  value,
  get label() {
    return i18n.t(`workflowMedia.modelAttributes.${key}`);
  },
});

export const PEOPLE_OPTIONS: { value: ModelPeople; label: string }[] = [
  translatedOption<ModelPeople>("single", "people.single"),
  translatedOption<ModelPeople>("group", "people.group"),
];

export const AGE_GROUP_OPTIONS: { value: ModelAgeGroup; label: string }[] = [
  translatedOption<ModelAgeGroup>("child", "ageGroups.child"),
  translatedOption<ModelAgeGroup>("teen", "ageGroups.teen"),
  translatedOption<ModelAgeGroup>("adult", "ageGroups.adult"),
  translatedOption<ModelAgeGroup>("senior", "ageGroups.senior"),
];

export const GENDER_OPTIONS: { value: ModelGender; label: string }[] = [
  translatedOption<ModelGender>("female", "genders.female"),
  translatedOption<ModelGender>("male", "genders.male"),
];

export const GROUP_TYPE_OPTIONS: { value: ModelGroupType; label: string }[] = [
  translatedOption<ModelGroupType>("family", "groupTypes.family"),
  translatedOption<ModelGroupType>("friends", "groupTypes.friends"),
  translatedOption<ModelGroupType>("couple", "groupTypes.couple"),
];

const labelOf = <T extends string>(options: { value: T; label: string }[], value?: T | null) =>
  options.find((option) => option.value === value)?.label;

/** A short label for who is in a photo: "Adult · Female", "Family"; null when not told. */
export const modelAttributesLabel = (attributes?: ModelAttributes | null) => {
  if (!attributes) return null;
  if (attributes.people === "group")
    return labelOf(GROUP_TYPE_OPTIONS, attributes.groupType) ?? i18n.t("workflowMedia.modelAttributes.group");
  const parts = [
    labelOf(AGE_GROUP_OPTIONS, attributes.ageGroup),
    labelOf(GENDER_OPTIONS, attributes.gender),
  ];
  return parts.filter(Boolean).join(" · ") || i18n.t("workflowMedia.modelAttributes.people.single");
};

/** The product types whose model photos stand in for one another (the backend's MockupRules.ApparelTypes). */
export const APPAREL_TYPES = ["tshirt", "hoodie"] as const;

/**
 * The group a model photo belongs to: "apparel" for a t-shirt or a hoodie, which share their model photos, the
 * product type itself (lower case) otherwise.
 */
export const modelCategory = (productType?: string | null) => {
  const type = (productType ?? "").toLowerCase();
  return (APPAREL_TYPES as readonly string[]).includes(type) ? "apparel" : type;
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
