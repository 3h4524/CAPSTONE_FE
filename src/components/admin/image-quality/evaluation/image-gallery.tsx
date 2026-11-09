import { useMemo } from "react";

import { ProductImages } from "@/components/admin/image-quality/evaluation/product-images";
import { SectionCard } from "@/components/admin/image-quality/section-card";
import { Accordion } from "@/components/ui/accordion";
import { groupImageEvalByProduct } from "@/helpers/image-eval-gallery";
import type { ImageEvalComparison, ImageEvalVersion } from "@/types/admin-image-quality";

type ImageGalleryProps = {
  comparison: ImageEvalComparison;
  versions: ImageEvalVersion[];
};

export const ImageGallery = ({ comparison, versions }: ImageGalleryProps) => {
  const lanes = useMemo(() => groupImageEvalByProduct(comparison), [comparison]);
  const labels = useMemo(
    () => new Map(versions.map((version) => [version.key, version.label])),
    [versions]
  );
  const firstProduct = lanes[0]?.product;

  return (
    <SectionCard
      title="Every image"
      description="The images behind the comparison, before on the left and after on the right. Transparent artwork sits on grey. A note is the check by eye where it disagreed with OCR."
    >
      {lanes.length === 0 ? (
        <p className="text-ink-500 px-6 py-12 text-center text-sm">
          No image matches the versions picked above.
        </p>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={firstProduct ? [firstProduct] : []}
          className="px-5 max-md:px-4 sm:px-6"
        >
          {lanes.map((lane) => (
            <ProductImages key={lane.product} lane={lane} versionLabels={labels} />
          ))}
        </Accordion>
      )}
    </SectionCard>
  );
};
