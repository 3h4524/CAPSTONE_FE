/**
 * What a model photo made with AI can show and how it looks. The server checks the same lists: a person can wear a
 * t-shirt or a hoodie. A mug, a poster or a phone case is not worn, and a tote bag is too seldom drawn face-on to be
 * found on the photo.
 */
export const MODEL_PHOTO_PRODUCT_TYPES = ["tshirt", "hoodie"] as const;

export const MODEL_PHOTO_SCENES = [
  "studio_grey",
  "studio_beige",
  "studio_dark",
  "street",
  "cafe",
  "park",
] as const;

export const MODEL_PHOTO_OUTFITS = ["casual", "streetwear", "minimal", "sporty"] as const;

export const MODEL_PHOTO_POSES = ["standing", "walking", "leaning", "seated"] as const;

/** Leaning or seated side by side, people's garments overlap, and each has to stand apart to be found. */
export const MODEL_PHOTO_GROUP_POSES: readonly ModelPhotoPose[] = ["standing", "walking"];

export type ModelPhotoScene = (typeof MODEL_PHOTO_SCENES)[number];
export type ModelPhotoOutfit = (typeof MODEL_PHOTO_OUTFITS)[number];
export type ModelPhotoPose = (typeof MODEL_PHOTO_POSES)[number];

export type ModelPhotoStyle = {
  scene: ModelPhotoScene;
  outfit: ModelPhotoOutfit;
  pose: ModelPhotoPose;
};

export const DEFAULT_MODEL_PHOTO_STYLE: ModelPhotoStyle = {
  scene: "studio_grey",
  outfit: "casual",
  pose: "standing",
};

/** The product to start from: the one asked for when a person can be shown with it, otherwise a t-shirt. */
export const modelPhotoProductType = (productType?: string): string =>
  productType && (MODEL_PHOTO_PRODUCT_TYPES as readonly string[]).includes(productType)
    ? productType
    : "tshirt";

/** The poses open to one person or to a group. */
export const posesFor = (group: boolean): readonly ModelPhotoPose[] =>
  group ? MODEL_PHOTO_GROUP_POSES : MODEL_PHOTO_POSES;

/** The style kept for one person or a group: a pose a group can't take becomes standing. */
export const styleFor = (style: ModelPhotoStyle, group: boolean): ModelPhotoStyle =>
  posesFor(group).includes(style.pose) ? style : { ...style, pose: "standing" };

/** Whether the scene is a studio, whose plain backdrop is quicker to find the people on than a real place. */
export const isStudioScene = (scene: ModelPhotoScene) => scene.startsWith("studio_");
