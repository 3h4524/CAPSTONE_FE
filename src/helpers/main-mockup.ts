import type { AiVideoSceneOptions, MockupAsset } from "@/types/video-workflow";

const ordinal = (left: string | null | undefined, right: string | null | undefined) => {
  const a = left ?? "";
  const b = right ?? "";
  return a < b ? -1 : a > b ? 1 : 0;
};

/**
 * The design's main mock-up, the image a scene starts from when no start frame was chosen for it. Mirrors the
 * server's `SceneSourceResolver.Hero`: a Hero first, one made from a template before an upload, then the color
 * code in plain order, then a stable tie-break (the server's last two keys are creation time and id).
 * Keyframes made for a scene are never the main mock-up: pass the design's mock-ups only.
 */
export const mainMockup = (assets: MockupAsset[]): MockupAsset | undefined =>
  [...assets].sort(
    (left, right) =>
      Number(right.role === "Hero") - Number(left.role === "Hero") ||
      Number(Boolean(right.mockupTemplateId)) - Number(Boolean(left.mockupTemplateId)) ||
      ordinal(left.variantKey, right.variantKey) ||
      ordinal(left.id, right.id)
  )[0];

/**
 * The design's model photo, the image an AI scene with a person (Product On Model, Creator POV, Everyday Story)
 * starts from when no start frame was chosen for it. Mirrors the server's `SceneSourceResolver.PersonImage`: the
 * approved Lifestyle mock-up, ordered by color then a stable tie-break, or undefined when the design has none.
 */
export const personMockup = (assets: MockupAsset[]): MockupAsset | undefined =>
  [...assets.filter((asset) => asset.role === "Lifestyle")].sort(
    (left, right) => ordinal(left.variantKey, right.variantKey) || ordinal(left.id, right.id)
  )[0];

/**
 * This design's counterpart of an image chosen on another design: the same template in the same color, else the
 * same template, else the same role unless it is the default Hero. Mirrors the server's `SceneSourceResolver`
 * translation, for an image the client knows (`known`, any design's mock-ups it has loaded).
 */
export const counterpartMockup = (
  chosenId: string,
  known: MockupAsset[],
  candidates: MockupAsset[]
): MockupAsset | undefined => {
  const own = candidates.find((asset) => asset.id === chosenId);
  if (own) return own;
  const chosen = known.find((asset) => asset.id === chosenId);
  if (!chosen) return undefined;
  if (chosen.mockupTemplateId) {
    const made = candidates.filter((asset) => asset.mockupTemplateId === chosen.mockupTemplateId);
    const sameColor = made.find((asset) => (asset.variantKey ?? "").toUpperCase() === (chosen.variantKey ?? "").toUpperCase());
    if (sameColor ?? made[0]) return sameColor ?? made[0];
  }
  return chosen.role && chosen.role !== "Hero" ? candidates.find((asset) => asset.role === chosen.role) : undefined;
};

/**
 * The image a scene starts from in the full video editor, given only the images of the design being edited. A start
 * frame saved on another design of a batch run is not among them, so it is translated the way the scene card and the
 * server's `SceneSourceResolver` do: the same template and color, else this design's main mock-up. Never "the first
 * image", which may be the model photo an AI scene starts from.
 */
export const sceneStartImage = (
  scene: Pick<AiVideoSceneOptions, "mockupId" | "startFrameMode" | "studioFrameId">,
  assets: MockupAsset[]
): MockupAsset | undefined => {
  const chosenId =
    scene.startFrameMode === "studio" && scene.studioFrameId ? scene.studioFrameId : scene.mockupId;
  const own = chosenId ? assets.find((asset) => asset.id === chosenId) : undefined;
  if (own) return own;

  const designMockups = assets.filter((asset) => !asset.regions?.studioFrame);
  const approved = designMockups.filter(
    (asset) => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision
  );
  const candidates = approved.length > 0 ? approved : designMockups;
  return (
    (scene.mockupId ? counterpartMockup(scene.mockupId, assets, candidates) : undefined) ??
    mainMockup(candidates)
  );
};
