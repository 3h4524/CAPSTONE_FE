import { api } from "@/api/client";
import type { PrintifyBlueprint, PrintifyCatalog, PrintifyProvider } from "@/api/printify";
import type { MockupTemplate } from "@/types/mockup-templates";

const base = "/api/admin/mockup-templates";

/** A side of the garment a Printify template can show. */
export type PrintifySide = "front" | "back" | "left" | "right";

export type PrintifyTemplateJobStatus = "queued" | "running" | "done" | "failed";

/** One Printify camera of a side: its bare white photo and the print area found on it, in its pixels. */
export type PrintifyCameraCandidate = {
  camera: string;
  photoUrl: string;
  photoWidth: number;
  photoHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PrintifySideResult = {
  view: PrintifySide;
  position: string;
  candidates: PrintifyCameraCandidate[];
  /** Why no camera of this side could be used. */
  problem: string | null;
};

/** A garment color as Printify photographs it, and the hex the white photo is recolored with to match it. */
export type PrintifyMeasuredColor = { name: string; photoHex: string; recolorHex: string };

/** A job measuring a Printify product on throwaway products in the platform's Printify store. */
export type PrintifyTemplateJob = {
  jobId: string;
  status: PrintifyTemplateJobStatus;
  step: string | null;
  error: string | null;
  blueprintId: number;
  blueprintTitle: string;
  blueprintImageUrl: string | null;
  printProviderId: number;
  printProviderTitle: string;
  /** The linked template the job adds sides or colors to; null for a new template. */
  templateId: string | null;
  views: PrintifySide[];
  colors: string[];
  sides: PrintifySideResult[];
  measuredColors: PrintifyMeasuredColor[];
  warnings: string[];
  sizes: string[];
  createdAt: string;
};

/** A garment color of a blueprint; a shared one is used by every blueprint without its own of that name. */
export type PrintifyColorRow = { id: string; name: string; hex: string; blueprintId: number | null; shared: boolean };

export const adminPrintifyKeys = {
  all: ["admin-mockup-printify"] as const,
  blueprints: (query: string) => [...adminPrintifyKeys.all, "blueprints", query] as const,
  providers: (blueprintId: number) => [...adminPrintifyKeys.all, "providers", blueprintId] as const,
  catalog: (blueprintId: number, providerId: number) => [...adminPrintifyKeys.all, "catalog", blueprintId, providerId] as const,
  job: (jobId: string) => [...adminPrintifyKeys.all, "job", jobId] as const,
  colors: (blueprintId: number) => [...adminPrintifyKeys.all, "colors", blueprintId] as const,
};

export const searchAdminPrintifyBlueprints = async (query: string) =>
  (await api.get<PrintifyBlueprint[]>(`${base}/printify/blueprints`, { params: { q: query } })).data;

export const getAdminPrintifyProviders = async (blueprintId: number) =>
  (await api.get<PrintifyProvider[]>(`${base}/printify/blueprints/${blueprintId}/providers`)).data;

export const getAdminPrintifyCatalog = async (blueprintId: number, providerId: number) =>
  (await api.get<PrintifyCatalog>(`${base}/printify/blueprints/${blueprintId}/providers/${providerId}`)).data;

/** Starts measuring a Printify product for a new template. */
export const startPrintifyTemplateJob = async (input: { blueprintId: number; printProviderId: number; views: PrintifySide[]; colors: string[] }) =>
  (await api.post<PrintifyTemplateJob>(`${base}/printify/jobs`, input)).data;

/** Starts measuring more sides (not the front) or colors of a template already linked to Printify. */
export const startPrintifyTemplateUpdateJob = async (templateId: string, input: { views: PrintifySide[]; colors: string[] }) =>
  (await api.post<PrintifyTemplateJob>(`${base}/${templateId}/printify/jobs`, input)).data;

export const getPrintifyTemplateJob = async (jobId: string, signal?: AbortSignal) =>
  (await api.get<PrintifyTemplateJob>(`${base}/printify/jobs/${jobId}`, { signal })).data;

export type CreatePrintifyTemplateInput = {
  /** The measured camera picked for each side. */
  cameras: Partial<Record<PrintifySide, string>>;
  /** The measured colors to keep in the blueprint's colors. */
  colors: string[];
  /** A new template's name and product type. */
  name?: string;
  productType?: string;
  defaultSizes?: string[];
};

/** Saves the template, or a linked template's new sides and colors, from a finished job. */
export const createPrintifyTemplate = async (jobId: string, input: CreatePrintifyTemplateInput) =>
  (await api.post<MockupTemplate>(`${base}/printify/jobs/${jobId}/create`, input)).data;

export const listPrintifyColors = async (blueprintId: number) =>
  (await api.get<PrintifyColorRow[]>(`${base}/printify/colors`, { params: { blueprintId } })).data;

export const savePrintifyColor = async (input: { blueprintId: number; name: string; hex: string }) =>
  (await api.put<PrintifyColorRow>(`${base}/printify/colors`, input)).data;

export const deletePrintifyColor = async (id: string) => {
  await api.delete(`${base}/printify/colors/${id}`);
};

/** The Printify print area a side is printed through. */
export const printifyPositionOf = (side: PrintifySide) => (side === "left" ? "left_sleeve" : side === "right" ? "right_sleeve" : side);

// Small areas named after a side (front_left_chest, back_neck), which are not the side itself.
const SMALL_AREAS = new Set(["neck", "chest", "pocket", "collar", "hood", "label", "tag", "yoke"]);

// A side is printed through its own area, optionally followed by "side" (front_side_dtf) and one word for how it is
// printed (front_dtf, left_sleeve_dtg). Matches the backend (PrintifyTemplateBuilder.PositionIn).
const printsSide = (position: string, side: PrintifySide) => {
  const plain = printifyPositionOf(side);
  const name = position.toLowerCase();
  if (name === plain) return true;
  if (!name.startsWith(`${plain}_`)) return false;
  const rest = name.slice(plain.length + 1).split("_");
  if (rest[0] === "side") rest.shift();
  return rest.length === 0 || (rest.length === 1 && /^[a-z0-9]+$/.test(rest[0]) && !SMALL_AREAS.has(rest[0]));
};

/** The sides a provider prints on, front first, from the print areas of its catalog. */
export const printableViews = (positions: string[]): PrintifySide[] =>
  (["front", "back", "left", "right"] as const).filter((side) => positions.some((position) => printsSide(position, side)));

/** Whether a job is still working, so its progress is asked again. */
export const isJobRunning = (job: Pick<PrintifyTemplateJob, "status"> | undefined) => job?.status === "queued" || job?.status === "running";

const JOB_POLL_MS = 3000;

/** How often a job's progress is asked again: until it is first read and while it works; never once it is done or failed. */
export const jobPollInterval = (job: Pick<PrintifyTemplateJob, "status"> | undefined) => (job === undefined || isJobRunning(job) ? JOB_POLL_MS : false);
