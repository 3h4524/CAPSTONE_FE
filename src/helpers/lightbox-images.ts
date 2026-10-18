import { garmentColorName } from "@/helpers/garment-colors";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import type { LightboxImage } from "@/types/commons";
import type { MockupImage } from "@/types/mockup-templates";

/** Every product's designs in the order they are listed, numbered by position like the grids do. */
export const designLightboxImages = (products: BatchJobProductResult[]): LightboxImage[] =>
  products.flatMap((product) =>
    product.images.map((image, position) => ({
      id: image.id,
      url: image.imageUrl,
      alt: `${product.productName}, variation ${position + 1}`,
      caption: `${product.productName} · Variation ${position + 1}`,
      width: image.widthPx || undefined,
      height: image.heightPx || undefined,
    }))
  );

/** A job's mock-ups, captioned with their product and, when recolored, the garment color. */
export const mockupLightboxImages = (images: MockupImage[], productNameById: Map<string | null, string>): LightboxImage[] =>
  images.map((image) => {
    const productName = productNameById.get(image.productId) ?? "Mock-up";
    return {
      id: image.id,
      url: image.mockupImageUrl,
      alt: productName,
      caption: image.garmentColor ? `${productName} · ${garmentColorName(image.garmentColor)}` : productName,
      width: image.mockupWidthPx || undefined,
      height: image.mockupHeightPx || undefined,
    };
  });
