import { Log } from "@/helpers/log";
import { type ImageEvalFile, imageEvalFileSchema } from "@/schemas/image-eval";

export type ImageEvalFileReadResult =
  | { isValid: true; content: ImageEvalFile }
  | { isValid: false; message: string };

const describeIssuePath = (path: ReadonlyArray<PropertyKey>): string =>
  path.length > 0 ? ` (at ${path.map(String).join(".")})` : "";

export const readImageEvalFile = async (file: File): Promise<ImageEvalFileReadResult> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch (error) {
    Log.warn({ prefix: "image-eval", message: "The export file is not JSON", data: error });
    return { isValid: false, message: "The file is not valid JSON." };
  }

  const result = imageEvalFileSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      isValid: false,
      message: issue
        ? `${issue.message}${describeIssuePath(issue.path)}`
        : "The file does not match the export format.",
    };
  }

  return { isValid: true, content: result.data };
};
