import type { MockupTemplate } from "@/types/mockup-templates";

export const MAX_MOCKUP_SELECTION = 5;

export const sortMockupList = (templates: MockupTemplate[]) =>
  [...templates].sort((left, right) => right.usageCount - left.usageCount || left.name.localeCompare(right.name));

export const selectionLabel = (count: number) =>
  count === 0 ? "Select mock-ups" : `${count} mock-up${count === 1 ? "" : "s"} selected`;
