"use client";

import {
  AGE_GROUP_OPTIONS,
  cleanAttributes,
  GENDER_OPTIONS,
  GROUP_TYPE_OPTIONS,
  PEOPLE_OPTIONS,
} from "@/helpers/model-attributes";
import type { ModelAttributes, ModelPhotoFilter } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type Option<T extends string> = { value: T; label: string };

/** A row of choices, one of which (or none, when `anyLabel` is given) is picked. */
export const ChoiceChips = <T extends string>({
  label,
  options,
  value,
  onChange,
  anyLabel,
  disabled = false,
}: {
  label: string;
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  /** Offers "any" first, which picks nothing. */
  anyLabel?: string;
  disabled?: boolean;
}) => {
  const choices: { value: T | null; label: string }[] = [
    ...(anyLabel ? [{ value: null, label: anyLabel }] : []),
    ...options,
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {choices.map((choice) => {
          const chosen = (value ?? null) === choice.value;
          return (
            <button
              key={choice.value ?? "any"}
              type="button"
              aria-pressed={chosen}
              disabled={disabled}
              onClick={() => onChange(choice.value)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-60",
                chosen
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              )}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Who is in a model photo: one person (an age group and a gender) or several people (a family, friends or a
 * couple). Switching between the two drops what no longer applies.
 */
export const ModelAttributesFields = ({
  value,
  onChange,
  disabled = false,
}: {
  value: ModelAttributes;
  onChange: (value: ModelAttributes) => void;
  disabled?: boolean;
}) => (
  <div className="space-y-3">
    <ChoiceChips
      label="Who is in the photo"
      options={PEOPLE_OPTIONS}
      value={value.people}
      disabled={disabled}
      onChange={(people) => people && onChange(cleanAttributes({ ...value, people }))}
    />
    {value.people === "single" ? (
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <ChoiceChips
          label="Age group"
          options={AGE_GROUP_OPTIONS}
          value={value.ageGroup}
          disabled={disabled}
          onChange={(ageGroup) => onChange({ ...value, ageGroup })}
        />
        <ChoiceChips
          label="Gender"
          options={GENDER_OPTIONS}
          value={value.gender}
          disabled={disabled}
          onChange={(gender) => onChange({ ...value, gender })}
        />
      </div>
    ) : (
      <ChoiceChips
        label="Group"
        options={GROUP_TYPE_OPTIONS}
        value={value.groupType}
        disabled={disabled}
        onChange={(groupType) => onChange({ ...value, groupType })}
      />
    )}
  </div>
);

/**
 * Narrows a list of model photos to the people wanted. With one person chosen, age group and gender narrow it
 * further; with several, the kind of group does.
 */
export const ModelPhotoFilterBar = ({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: ModelPhotoFilter;
  onChange: (value: ModelPhotoFilter) => void;
  disabled?: boolean;
  className?: string;
}) => (
  <div className={cn("flex flex-wrap gap-x-6 gap-y-3", className)}>
    <ChoiceChips
      label="People"
      options={PEOPLE_OPTIONS}
      value={value.people}
      anyLabel="All"
      disabled={disabled}
      // Changing between one and several people drops the narrower choices of the other.
      onChange={(people) => onChange(people ? { people } : {})}
    />
    {value.people === "single" && (
      <>
        <ChoiceChips
          label="Age group"
          options={AGE_GROUP_OPTIONS}
          value={value.ageGroup}
          anyLabel="Any"
          disabled={disabled}
          onChange={(ageGroup) => onChange({ ...value, ageGroup })}
        />
        <ChoiceChips
          label="Gender"
          options={GENDER_OPTIONS}
          value={value.gender}
          anyLabel="Any"
          disabled={disabled}
          onChange={(gender) => onChange({ ...value, gender })}
        />
      </>
    )}
    {value.people === "group" && (
      <ChoiceChips
        label="Group"
        options={GROUP_TYPE_OPTIONS}
        value={value.groupType}
        anyLabel="Any"
        disabled={disabled}
        onChange={(groupType) => onChange({ ...value, groupType })}
      />
    )}
  </div>
);

export type PhotoSource = "system" | "mine";

const SOURCE_OPTIONS: Option<PhotoSource>[] = [
  { value: "system", label: "System" },
  { value: "mine", label: "Mine" },
];

/** The photos from one source: the shared library's (system) or the person's own; null keeps all. */
export const filterBySource = <T extends { isSystemTemplate: boolean }>(
  photos: T[],
  source: PhotoSource | null
): T[] =>
  source === null
    ? photos
    : photos.filter((photo) => photo.isSystemTemplate === (source === "system"));

/** Narrows model photos to the shared library's or the person's own. */
export const PhotoSourceFilter = ({
  value,
  onChange,
  disabled = false,
}: {
  value: PhotoSource | null;
  onChange: (value: PhotoSource | null) => void;
  disabled?: boolean;
}) => (
  <ChoiceChips
    label="Source"
    options={SOURCE_OPTIONS}
    value={value}
    anyLabel="All"
    disabled={disabled}
    onChange={onChange}
  />
);

/** Says whose a photo is, in the app's own color: filled for the shared library, outlined for one's own. */
export const PhotoSourceTag = ({ system, className }: { system: boolean; className?: string }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
      system ? "bg-primary text-white" : "border-primary text-primary border bg-white",
      className
    )}
  >
    {system ? "System" : "Mine"}
  </span>
);
