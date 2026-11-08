import type {
  ImageEvalComparison,
  ImageEvalImage,
  ImageEvalProductLanes,
} from "@/types/admin-image-quality";

const getFirstExpectedText = (images: ReadonlyArray<ImageEvalImage>): string | null =>
  images.find((image) => image.expectedText !== null)?.expectedText ?? null;

export const groupImageEvalByProduct = (
  comparison: ImageEvalComparison
): ImageEvalProductLanes[] =>
  comparison.products.map((product) => {
    const before = comparison.beforeImages.filter((image) => image.product === product);
    const after = comparison.afterImages.filter((image) => image.product === product);

    return {
      product,
      expectedText: getFirstExpectedText([...after, ...before]),
      before,
      after,
    };
  });
