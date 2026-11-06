import type {
  ImageEvalBooleanField,
  ImageEvalImage,
  ImageEvalNumberField,
  ImageEvalSideValue,
} from "@/types/admin-image-quality";

export const getImageEvalRate = (
  images: ReadonlyArray<ImageEvalImage>,
  field: ImageEvalBooleanField
): ImageEvalSideValue => {
  const answers = images
    .map((image) => image[field])
    .filter((answer): answer is boolean => typeof answer === "boolean");
  const yes = answers.filter(Boolean).length;

  return {
    value: answers.length > 0 ? yes / answers.length : null,
    yes,
    count: answers.length,
  };
};

export const getImageEvalMean = (
  images: ReadonlyArray<ImageEvalImage>,
  field: ImageEvalNumberField
): ImageEvalSideValue => {
  const values = images
    .map((image) => image[field])
    .filter((value): value is number => typeof value === "number");
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    value: values.length > 0 ? total / values.length : null,
    yes: null,
    count: values.length,
  };
};
