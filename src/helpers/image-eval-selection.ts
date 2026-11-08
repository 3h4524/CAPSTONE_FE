import type { ImageEvalSelection } from "@/types/admin-image-quality";

export type ImageEvalSide = "before" | "after";

export const toggleImageEvalVersion = (
  selection: ImageEvalSelection,
  side: ImageEvalSide,
  key: string
): ImageEvalSelection => {
  const current = selection[side];
  const next = current.includes(key)
    ? current.filter((item) => item !== key)
    : [...current, key];
  return { ...selection, [side]: next };
};

const haveSameKeys = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean =>
  left.length === right.length && left.every((key) => right.includes(key));

export const isSameImageEvalSelection = (
  left: ImageEvalSelection,
  right: ImageEvalSelection
): boolean =>
  haveSameKeys(left.before, right.before) &&
  haveSameKeys(left.after, right.after) &&
  left.isSameProductsOnly === right.isSameProductsOnly &&
  left.isNewestPerProduct === right.isNewestPerProduct;
