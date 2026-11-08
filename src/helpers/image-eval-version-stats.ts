import { getImageEvalMean, getImageEvalRate } from "@/helpers/image-eval-measure";
import type {
  ImageEvalImage,
  ImageEvalVersion,
  ImageEvalVersionStats,
} from "@/types/admin-image-quality";

export const getImageEvalVersionStats = (
  images: ReadonlyArray<ImageEvalImage>,
  versions: ReadonlyArray<ImageEvalVersion>
): ImageEvalVersionStats[] =>
  [...versions]
    .sort((left, right) => left.order - right.order || left.key.localeCompare(right.key))
    .map((version) => {
      const lettered = images.filter(
        (image) => image.version === version.key && image.expectedText !== null
      );

      return {
        version,
        letteredCount: lettered.length,
        textOk: getImageEvalRate(lettered, "textOk").value,
        textClear: getImageEvalRate(lettered, "textClear").value,
        layoutOk: getImageEvalRate(lettered, "layoutOk").value,
        clipOverall: getImageEvalMean(lettered, "clipOverall").value,
        musiq: getImageEvalMean(lettered, "musiq").value,
      };
    })
    .filter((stats) => stats.letteredCount > 0);
