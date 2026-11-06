import { IMAGE_EVAL_GROUP_LABELS, IMAGE_EVAL_METRICS } from "@/constants/image-quality";
import { getFisherExactPValue } from "@/helpers/fisher-exact-test";
import { getImageEvalMean, getImageEvalRate } from "@/helpers/image-eval-measure";
import type {
  ImageEvalComparison,
  ImageEvalImage,
  ImageEvalMetricDefinition,
  ImageEvalMetricGroupRows,
  ImageEvalMetricResult,
  ImageEvalPreset,
  ImageEvalSelection,
  ImageEvalVersion,
} from "@/types/admin-image-quality";

const getVersionKeys = (
  versions: ReadonlyArray<ImageEvalVersion>,
  phase: ImageEvalVersion["phase"]
): string[] =>
  versions.filter((version) => version.phase === phase).map((version) => version.key);

export const getDefaultImageEvalSelection = (
  versions: ReadonlyArray<ImageEvalVersion>
): ImageEvalSelection => {
  const afterProviders = new Set(
    versions.filter((version) => version.phase === "after").map((version) => version.provider)
  );
  const sameProviderBefore = versions
    .filter((version) => version.phase === "before" && afterProviders.has(version.provider))
    .map((version) => version.key);

  return {
    before: sameProviderBefore.length > 0 ? sameProviderBefore : getVersionKeys(versions, "before"),
    after: getVersionKeys(versions, "after"),
    isSameProductsOnly: true,
    isNewestPerProduct: true,
  };
};

export const getImageEvalPresets = (
  versions: ReadonlyArray<ImageEvalVersion>
): ImageEvalPreset[] => {
  const afterKeys = getVersionKeys(versions, "after");
  if (afterKeys.length === 0) {
    return [];
  }

  return versions
    .filter((version) => version.phase === "before")
    .map((version) => ({
      key: version.key,
      label: `${version.label} → newest prompt`,
      selection: {
        before: [version.key],
        after: afterKeys,
        isSameProductsOnly: true,
        isNewestPerProduct: true,
      },
    }));
};

const keepNewestPerProduct = (
  images: ReadonlyArray<ImageEvalImage>,
  orderByVersion: ReadonlyMap<string, number>
): ImageEvalImage[] => {
  const newestOrder = new Map<string, number>();
  for (const image of images) {
    const order = orderByVersion.get(image.version) ?? 0;
    newestOrder.set(image.product, Math.max(order, newestOrder.get(image.product) ?? order));
  }

  return images.filter(
    (image) => (orderByVersion.get(image.version) ?? 0) === newestOrder.get(image.product)
  );
};

const measureMetric = (
  definition: ImageEvalMetricDefinition,
  beforeImages: ReadonlyArray<ImageEvalImage>,
  afterImages: ReadonlyArray<ImageEvalImage>
): ImageEvalMetricResult => {
  const before =
    definition.kind === "rate"
      ? getImageEvalRate(beforeImages, definition.field)
      : getImageEvalMean(beforeImages, definition.field);
  const after =
    definition.kind === "rate"
      ? getImageEvalRate(afterImages, definition.field)
      : getImageEvalMean(afterImages, definition.field);

  const delta =
    before.value !== null && after.value !== null ? after.value - before.value : null;
  const pValue =
    definition.kind === "rate" &&
    before.yes !== null &&
    after.yes !== null &&
    before.count > 0 &&
    after.count > 0
      ? getFisherExactPValue(
          before.yes,
          before.count - before.yes,
          after.yes,
          after.count - after.yes
        )
      : null;

  return { definition, before, after, delta, pValue };
};

export const groupImageEvalMetrics = (
  metrics: ReadonlyArray<ImageEvalMetricResult>
): ImageEvalMetricGroupRows[] => {
  const groups: ImageEvalMetricGroupRows[] = [];
  for (const metric of metrics) {
    const group = groups.find((item) => item.group === metric.definition.group);
    if (group) {
      group.metrics.push(metric);
    } else {
      groups.push({
        group: metric.definition.group,
        label: IMAGE_EVAL_GROUP_LABELS[metric.definition.group],
        metrics: [metric],
      });
    }
  }
  return groups;
};

export const findImageEvalMetric = (
  comparison: ImageEvalComparison,
  field: ImageEvalMetricDefinition["field"]
): ImageEvalMetricResult | null =>
  comparison.metrics.find((metric) => metric.definition.field === field) ?? null;

export const compareImageEvalVersions = (
  images: ReadonlyArray<ImageEvalImage>,
  versions: ReadonlyArray<ImageEvalVersion>,
  selection: ImageEvalSelection
): ImageEvalComparison => {
  const orderByVersion = new Map(versions.map((version) => [version.key, version.order]));
  const beforeKeys = new Set(selection.before);
  const afterKeys = new Set(selection.after);

  let beforeImages = images.filter((image) => beforeKeys.has(image.version));
  let afterImages = images.filter((image) => afterKeys.has(image.version));

  if (selection.isSameProductsOnly) {
    const beforeProducts = new Set(beforeImages.map((image) => image.product));
    const afterProducts = new Set(afterImages.map((image) => image.product));
    beforeImages = beforeImages.filter((image) => afterProducts.has(image.product));
    afterImages = afterImages.filter((image) => beforeProducts.has(image.product));
  }

  if (selection.isNewestPerProduct) {
    afterImages = keepNewestPerProduct(afterImages, orderByVersion);
  }

  const products = [
    ...new Set([...beforeImages, ...afterImages].map((image) => image.product)),
  ].sort((left, right) => left.localeCompare(right));

  return {
    products,
    beforeImages,
    afterImages,
    metrics: IMAGE_EVAL_METRICS.map((definition) =>
      measureMetric(definition, beforeImages, afterImages)
    ),
  };
};
