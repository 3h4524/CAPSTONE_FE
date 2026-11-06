import { describe, expect, it, vi } from "vitest";

import { readImageEvalFile } from "@/helpers/image-eval-file";

vi.mock("@/helpers/log", () => ({ Log: { warn: vi.fn() } }));

const IMAGE = {
  id: "ideogram-old-Coffee-v1",
  version: "ideogram-old",
  product: "Coffee Then Code",
  productType: "tshirt",
  expectedText: "Coffee Then Code",
  imageUrl: "https://res.cloudinary.com/demo/image/upload/coffee.png",
  thumbnail: "data:image/jpeg;base64,AAAA",
  ocrText: "COFFEE / THEN / CODE",
  textOk: true,
  textOkOcr: true,
  textClear: true,
  note: "",
  cer: 0,
  layoutOk: true,
  notCut: true,
  centred: true,
  sizeOk: true,
  musiq: 70,
  topiqNr: 0.7,
  clipIqaPlus: 0.7,
  liqe: 4.5,
  laionAes: 5,
  clipOverall: 35,
  clipElements: 25,
};

const VERSION = {
  key: "ideogram-old",
  label: "Ideogram · original prompt",
  provider: "ideogram",
  phase: "before",
  order: 1,
};

const buildFile = (content: string): File =>
  new File([content], "eval.json", { type: "application/json" });

describe("readImageEvalFile", () => {
  it("accepts a file in the export format", async () => {
    const result = await readImageEvalFile(
      buildFile(JSON.stringify({ versions: [VERSION], images: [IMAGE] }))
    );

    expect(result.isValid).toBe(true);
  });

  it("rejects text that is not JSON", async () => {
    const result = await readImageEvalFile(buildFile("not json"));

    expect(result).toEqual({ isValid: false, message: "The file is not valid JSON." });
  });

  it("rejects an image whose version is not listed", async () => {
    const result = await readImageEvalFile(
      buildFile(
        JSON.stringify({ versions: [VERSION], images: [{ ...IMAGE, version: "test-Z" }] })
      )
    );

    expect(result).toEqual({
      isValid: false,
      message: "Some images name a prompt version the file does not list. (at images)",
    });
  });

  it("names the field that breaks the format", async () => {
    const result = await readImageEvalFile(
      buildFile(JSON.stringify({ versions: [VERSION], images: [{ ...IMAGE, musiq: "high" }] }))
    );

    expect(result.isValid).toBe(false);
    expect(result.isValid ? "" : result.message).toContain("images.0.musiq");
  });
});
