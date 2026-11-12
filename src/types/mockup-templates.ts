/** One person, or several people all dressed in the same mock-up. */
export type ModelPeople = "single" | "group";
export type ModelAgeGroup = "child" | "teen" | "adult" | "senior";
export type ModelGender = "female" | "male";
export type ModelGroupType = "family" | "friends" | "couple";

/** Who is in a model photo: one person of an age group and gender, or a group of a kind. */
export interface ModelAttributes {
  people: ModelPeople;
  ageGroup?: ModelAgeGroup | null;
  gender?: ModelGender | null;
  groupType?: ModelGroupType | null;
}

/** Narrows the model photos listed; a part left out matches any. */
export type ModelPhotoFilter = Partial<ModelAttributes>;

export interface MockupTemplate {
  id: string;
  name: string;
  productType: string;
  baseImageUrl: string;
  previewImageUrl: string | null;
  printAreaConfig: string;
  outputWidthPx: number;
  outputHeightPx: number;
  usageCount: number;
  isSystemTemplate: boolean;
  isMine: boolean;
  realisticPrintReady: boolean;
  allowRecolor: boolean;
  garmentMaskUrl: string | null;
  garmentColor: string | null;
  /** Whether a run may put the garment on another background (the photo has been analyzed). */
  allowBackground?: boolean;
  /** "garment" for a photo of the garment alone, "model" for a person wearing it (a model photo). */
  kind?: "garment" | "model";
  /** For a model photo, who is in it; null when not told. */
  attributes?: ModelAttributes | null;
  /** Whether the photo was made by AI rather than uploaded. */
  aiGenerated?: boolean;
  /** Photos of the template's other sides (back, left sleeve, right sleeve), each a template of its own. */
  views?: MockupTemplate[] | null;
  /**
   * The Printify product the photo shows; null for a template not linked to Printify. Its print area is Printify's
   * print area, so a design is placed inside it, never past it.
   */
  printify?: MockupTemplatePrintify | null;
}

/** A Printify garment color: Printify's name and the hex the template photo is recolored with to match it. */
export interface PrintifyGarmentColor {
  name: string;
  hex: string;
}

export interface MockupTemplatePrintify {
  blueprintId: number;
  blueprintTitle: string;
  printProviderId: number | null;
  printProviderTitle: string | null;
  defaultSizes: string[];
  colors: PrintifyGarmentColor[];
}

export interface BatchMockupSelection {
  batchJobId: string;
  templateIds: string[];
  /** Colors shared by recolorable templates that have none of their own (older selections only). */
  garmentColors: string[];
  /** Colors chosen per template, keyed by template id. */
  templateColors?: Record<string, string[]>;
  /** Background colors chosen per template, keyed by template id and then by garment color or "default". */
  templateBackgrounds?: Record<string, Record<string, string>>;
  /** What each print area of a template prints, keyed by template id and then area key. */
  areaSources?: Record<string, Record<string, MockupAreaSource>> | null;
}

export interface MockupPrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Which side of the garment a template photo shows. */
export type MockupView = "front" | "back" | "left" | "right" | "side";

/**
 * What is printed in a print area: the design the mock-up is made of, another design (named by `designImageId`), or
 * nothing.
 */
export type MockupAreaSourceKind = "same" | "design" | "none";

/** One print area of a template photo, such as the chest, a sleeve or the back of the neck. */
export interface MockupArea extends MockupPrintArea {
  /** "main" for the template's main area, else a short lowercase key such as "sleeve-left". */
  key: string;
  name: string | null;
  /** Degrees the design is turned about the area's center, clockwise, from -180 to 180. */
  rotation: number;
  /** On a template, its default ("same" or "none"); on a mock-up, what it prints. */
  source: MockupAreaSourceKind;
  designImageId?: string | null;
}

/** A template's side of the garment and print areas, the main one first. */
export interface MockupPrintLayout {
  view: MockupView;
  areas: MockupArea[];
}

/** What a run prints in one print area of a template. */
export interface MockupAreaSource {
  kind: MockupAreaSourceKind;
  designImageId?: string | null;
}

export interface MockupImage {
  id: string;
  productId: string;
  designImageId: string;
  mockupTemplateId: string;
  mockupImageUrl: string;
  mockupWidthPx: number;
  mockupHeightPx: number;
  approvalStatus: string;
  garmentColor: string | null;
  /** '#RRGGBB' when the mock-up was put on a replaced background. */
  backgroundColor?: string | null;
  /** In a batch job's results, which of the job's mock-ups this is: what a change to it alone is saved under. */
  slotKey?: string | null;
  /** In a batch job's results, how this mock-up is made apart from the job's settings, when it is. */
  override?: MockupOverride | null;
}

/** How one mock-up of a batch job is made instead of by the job's settings. The job keeps it. */
export interface MockupOverride {
  mockupTemplateId: string;
  /** null keeps the template's own garment color. */
  garmentColor: string | null;
  /** null keeps the photo's own background. */
  backgroundColor: string | null;
  /** null uses the template's own print area. */
  printArea: MockupPrintArea | null;
  /** true when no mock-up is made there at all. */
  removed?: boolean;
  /** The template's print areas as set for this mock-up alone; takes the place of `printArea`. */
  areas?: MockupArea[] | null;
}

/** A mock-up the job's settings would make that was removed for its product alone. */
export interface RemovedMockupSlot {
  slotKey: string;
  productId: string;
  designImageId: string;
  mockupTemplateId: string;
  templateName: string;
  garmentColor: string | null;
  /** What the mock-up looks like as it was set up, to show it before it is put back. */
  mockupImageUrl?: string | null;
  /** How it was set up apart from the job's settings when it was removed; it comes back with this. */
  override?: MockupOverride | null;
}

export interface GenerateAllMockupsResult {
  generatedCount: number;
  noDesignImageCount: number;
  noCompatibleTemplateCount: number;
  /** Products whose designs exist but none is approved yet (jobs that need approval). */
  noApprovedImageCount?: number;
  errors: string[];
  images: MockupImage[];
  removed?: RemovedMockupSlot[] | null;
}

export interface GarmentMaskPreview {
  /** How many separate garments were found: one per person standing apart. */
  garmentCount?: number | null;
  recolorable: boolean;
  reason: string | null;
  maskDataUrl: string | null;
  /** For a model photo: the garment the person wears, found by the clothes model (opacity = garment). */
  garmentDataUrl?: string | null;
}
