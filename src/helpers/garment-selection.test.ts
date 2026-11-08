import { describe, expect, it } from "vitest";

import {
  autoSelectGarment,
  chestPrintArea,
  createSelectionPhoto,
  editorSize,
  fillSmallHoles,
  findGarmentSeed,
  growRegion,
  paintStroke,
  rgbToLab,
  selectionBounds,
  selectionCoverage,
  selectionFromAlpha,
  selectionToRgba,
  unionMasks,
} from "@/helpers/garment-selection";

type Rgb = [number, number, number];

const WHITE_SHIRT: Rgb = [235, 235, 232];
const SHIRT_FOLD: Rgb = [170, 170, 168];
const SKIN: Rgb = [214, 168, 140];
const JEANS: Rgb = [60, 80, 130];
const BACKDROP: Rgb = [228, 228, 228];

// A 20 x 20 photo: backdrop around a person in columns 4..15; an arm (skin) down columns 4..5, the shirt
// beside it on rows 0..9 with a shadowed fold along row 6, jeans below.
const photoOf = (
  colorAt: (x: number, y: number) => Rgb,
  personAt: (x: number, y: number) => boolean = (x) => x >= 4 && x <= 15
) => {
  const width = 20;
  const height = 20;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const person = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const [r, g, b] = colorAt(x, y);
      rgba.set([r, g, b, 255], i * 4);
      person[i] = personAt(x, y) ? 255 : 0;
    }
  }
  return createSelectionPhoto(width, height, rgba, person);
};

const model = (x: number, y: number): Rgb => {
  if (x < 4 || x > 15) return BACKDROP;
  if (y >= 10) return JEANS;
  if (x <= 5) return SKIN;
  return y === 6 ? SHIRT_FOLD : WHITE_SHIRT;
};

const at = (mask: Uint8Array, x: number, y: number) => mask[y * 20 + x];

describe("rgbToLab", () => {
  it("puts white at full lightness with no color", () => {
    const [l, a, b] = rgbToLab(255, 255, 255);
    expect(l).toBeCloseTo(100, 0);
    expect(Math.abs(a)).toBeLessThan(0.5);
    expect(Math.abs(b)).toBeLessThan(0.5);
  });
});

describe("growRegion", () => {
  it("selects the shirt, across a shadowed fold, but not the skin, the jeans or the backdrop", () => {
    const region = growRegion(photoOf(model), 10, 4);

    expect(at(region, 10, 4)).toBe(1);
    expect(at(region, 10, 6)).toBe(1);
    expect(at(region, 4, 4)).toBe(0);
    expect(at(region, 10, 12)).toBe(0);
    expect(at(region, 1, 4)).toBe(0);
    // Shirt: columns 6..15, rows 0..9.
    expect(selectionCoverage(region)).toBeCloseTo((10 * 10) / 400, 5);
  });

  it("stays off a backdrop of the shirt's own color when the person is known", () => {
    const sameColor = photoOf((x, y) => (x < 4 || x > 15 ? WHITE_SHIRT : model(x, y)));

    const region = growRegion(sameColor, 10, 4);

    expect(at(region, 1, 4)).toBe(0);
    expect(at(region, 18, 4)).toBe(0);
  });

  it("selects nothing for a click off the person", () => {
    expect(selectionCoverage(growRegion(photoOf(model), 1, 1))).toBe(0);
  });

  it("follows the slider: a strict tolerance stops at the fold", () => {
    const region = growRegion(photoOf(model), 10, 4, 4);

    expect(at(region, 10, 4)).toBe(1);
    // The fold's lightness is too far for the strictest setting.
    expect(at(region, 10, 8)).toBe(0);
  });
});

describe("autoSelectGarment", () => {
  it("finds the white shirt down the middle of the person and selects it", () => {
    const photo = photoOf(model);

    const seed = findGarmentSeed(photo);
    const selected = autoSelectGarment(photo);

    expect(seed).not.toBeNull();
    expect(model(seed!.x, seed!.y)).not.toBe(SKIN);
    expect(selected).not.toBeNull();
    expect(selectionCoverage(selected!)).toBeCloseTo((10 * 10) / 400, 5);
    expect(at(selected!, 4, 4)).toBe(0);
  });

  it("finds nothing on a person in a dark shirt", () => {
    const dark = photoOf((x, y) => (x >= 6 && x <= 15 && y < 10 ? [40, 40, 45] : model(x, y)));

    expect(findGarmentSeed(dark)).toBeNull();
    expect(autoSelectGarment(dark)).toBeNull();
  });

  it("finds nothing when there is no person", () => {
    const empty = photoOf(model, () => false);

    expect(autoSelectGarment(empty)).toBeNull();
  });
});

describe("fillSmallHoles", () => {
  it("fills a small enclosed gap but keeps a gap open to the edge", () => {
    const mask = new Uint8Array(400).fill(1);
    mask[10 * 20 + 10] = 0;
    for (let y = 0; y < 20; y++) mask[y * 20] = 0;

    const filled = fillSmallHoles(mask, 20, 20, 0.01);

    expect(at(filled, 10, 10)).toBe(1);
    expect(at(filled, 0, 5)).toBe(0);
  });

  it("keeps a large enclosed gap, such as a hand on the shirt", () => {
    const mask = new Uint8Array(400).fill(1);
    for (let y = 5; y < 15; y++) for (let x = 5; x < 15; x++) mask[y * 20 + x] = 0;

    expect(at(fillSmallHoles(mask, 20, 20, 0.01), 10, 10)).toBe(0);
  });
});

describe("paintStroke", () => {
  const photo = { width: 20, height: 20, person: photoOf(model).person };

  it("adds along the stroke, but only on the person", () => {
    const painted = paintStroke(new Uint8Array(400), photo, { x: 0, y: 3 }, { x: 19, y: 3 }, 1, 1);

    expect(at(painted, 10, 3)).toBe(1);
    expect(at(painted, 1, 3)).toBe(0);
    expect(at(painted, 10, 8)).toBe(0);
  });

  it("erases anywhere", () => {
    const erased = paintStroke(
      new Uint8Array(400).fill(1),
      photo,
      { x: 2, y: 2 },
      { x: 2, y: 2 },
      1.5,
      0
    );

    expect(at(erased, 2, 2)).toBe(0);
    expect(at(erased, 10, 10)).toBe(1);
  });
});

describe("masks", () => {
  it("unites two selections", () => {
    const left = new Uint8Array([1, 0, 0]);
    const right = new Uint8Array([0, 0, 1]);

    expect([...unionMasks(left, right)]).toEqual([1, 0, 1]);
  });

  it("reads a saved mask's opacity and exports a selection as opaque white", () => {
    const selection = selectionFromAlpha(new Uint8Array([0, 127, 128, 255]));

    expect([...selection]).toEqual([0, 0, 1, 1]);
    expect([...selectionToRgba(selection)]).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("boxes the selection and puts a first print area on the chest of it", () => {
    const mask = new Uint8Array(400);
    for (let y = 2; y < 12; y++) for (let x = 6; x < 16; x++) mask[y * 20 + x] = 1;

    const bounds = selectionBounds(mask, 20);

    expect(bounds).toEqual({ x: 6, y: 2, width: 10, height: 10 });
    expect(chestPrintArea(bounds!, 10)).toEqual({ x: 85, y: 38, width: 50, height: 50 });
    expect(selectionBounds(new Uint8Array(400), 20)).toBeNull();
  });

  it("works on the photo scaled down to its longest side", () => {
    expect(editorSize({ width: 4000, height: 3000 })).toEqual({ width: 1600, height: 1200 });
    expect(editorSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });
});
