import { z } from "zod";

import { i18n } from "@/i18n/client";

const MAX_FILE_MEGABYTES = 10;
const BYTES_PER_MEGABYTE = 1024 * 1024;

const nullableNumber = z.number().finite().nullable();
const nullableBoolean = z.boolean().nullable();

export const imageEvalVersionSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  provider: z.enum(["gemini", "ideogram"]),
  phase: z.enum(["before", "after", "trial"]),
  order: z.number().int(),
});

export const imageEvalFileImageSchema = z.object({
  id: z.string().trim().min(1).max(200),
  version: z.string().trim().min(1).max(100),
  product: z.string().trim().min(1).max(300),
  productType: z.string().nullable(),
  expectedText: z.string().nullable(),
  imageUrl: z.string().url().nullable().optional(),
  thumbnail: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/, { error: () => i18n.t("admin.schemas.imageEval.thumbnailBase64") })
    .nullable()
    .optional(),
  ocrText: z.string(),
  textOk: nullableBoolean,
  textOkOcr: nullableBoolean,
  textClear: nullableBoolean,
  note: z.string(),
  cer: nullableNumber,
  layoutOk: nullableBoolean,
  notCut: nullableBoolean,
  centred: nullableBoolean,
  sizeOk: nullableBoolean,
  musiq: nullableNumber,
  topiqNr: nullableNumber,
  clipIqaPlus: nullableNumber,
  liqe: nullableNumber,
  laionAes: nullableNumber,
  clipOverall: nullableNumber,
  clipElements: nullableNumber,
});

export const imageEvalFileSchema = z
  .object({
    versions: z.array(imageEvalVersionSchema).min(1, { error: () => i18n.t("admin.schemas.imageEval.fileNoVersions") }),
    images: z.array(imageEvalFileImageSchema).min(1, { error: () => i18n.t("admin.schemas.imageEval.fileNoImages") }),
  })
  .refine(
    (file) => {
      const keys = new Set(file.versions.map((version) => version.key));
      return file.images.every((image) => keys.has(image.version));
    },
    { error: () => i18n.t("admin.schemas.imageEval.unknownVersion"), path: ["images"] }
  );

export const imageEvalUploadFormSchema = z.object({
  name: z.string().trim().min(3, { error: () => i18n.t("admin.schemas.imageEval.runNameMin") }).max(200),
  notes: z.string().trim().max(1000),
  file: z
    .instanceof(File, { error: () => i18n.t("admin.schemas.imageEval.chooseExportFile") })
    .refine((file) => file.name.toLowerCase().endsWith(".json"), { error: () => i18n.t("admin.schemas.imageEval.chooseJson") })
    .refine(
      (file) => file.size > 0 && file.size <= MAX_FILE_MEGABYTES * BYTES_PER_MEGABYTE,
      { error: () => i18n.t("admin.schemas.imageEval.fileMax", { mb: MAX_FILE_MEGABYTES }) }
    ),
});

export type ImageEvalFile = z.infer<typeof imageEvalFileSchema>;

export type ImageEvalUploadFormValues = z.infer<typeof imageEvalUploadFormSchema>;

export type ImageEvalUploadInput = ImageEvalFile & {
  name: string;
  notes: string | null;
};
