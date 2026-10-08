import type { MockupAsset, VideoTemplateCatalogItem, VideoTemplateRequirements } from "@/types/video-workflow";

type TemplateAsset = Pick<MockupAsset, "approvalStatus" | "approvedRevision" | "revision" | "role" | "variantKey" | "regions">;

export const usableVideoAssets = (assets: TemplateAsset[] | null | undefined) =>
  (assets ?? []).filter(asset =>
    asset != null && asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision
  );

const fallbackRequirements = (code: string): VideoTemplateRequirements => {
  if (code === "design_detail") return { minimumAssets: 1, requiresDetail: true, minimumVariants: 0 };
  if (code === "variant_showcase") return { minimumAssets: 2, requiresDetail: false, minimumVariants: 2 };
  return { minimumAssets: 1, requiresDetail: false, minimumVariants: 0 };
};

const resolveRequirements = (template: VideoTemplateCatalogItem): VideoTemplateRequirements =>
  template?.requirements ?? fallbackRequirements(template?.code ?? "");

export const recommendVideoTemplate = (assets: TemplateAsset[] | null | undefined) => {
  const usable = usableVideoAssets(assets);
  const variants = new Set(usable.map(asset => asset.variantKey).filter((value): value is string => Boolean(value)));
  if (variants.size >= 2) return { code: "variant_showcase", reason: "Recommended because this product has multiple approved variants." };
  if (usable.some(asset => asset.role === "ArtworkDetail" || asset.regions?.detail))
    return { code: "design_detail", reason: "Recommended because an approved artwork detail is available." };
  return { code: "product_showcase", reason: "Recommended for a clear product-first video." };
};

export const getTemplateAvailability = (template: VideoTemplateCatalogItem, assets: TemplateAsset[] | null | undefined) => {
  const usable = usableVideoAssets(assets);
  const variants = new Set(usable.map(asset => asset.variantKey).filter((value): value is string => Boolean(value))).size;
  const hasDetail = usable.some(asset => asset.role === "ArtworkDetail" || asset.regions?.detail);
  const requirements = resolveRequirements(template);
  if (usable.length < requirements.minimumAssets)
    return { available: false, reason: `Approve at least ${requirements.minimumAssets} mockup${requirements.minimumAssets === 1 ? "" : "s"}.` };
  if (requirements.requiresDetail && !hasDetail)
    return { available: false, reason: "Add an Artwork Detail image or mark a detail region." };
  if (variants < requirements.minimumVariants)
    return { available: false, reason: `Name at least ${requirements.minimumVariants} approved variants.` };
  return { available: true, reason: null };
};
