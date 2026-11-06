// Selecting the garment on a model photo: a click grows a region of the garment's color, kept inside the
// person the server found, and a brush adds or erases by hand. Masks are one byte per pixel, 1 = selected.

export type SelectionMask = Uint8Array;

export type SelectionPhoto = {
  width: number;
  height: number;
  /** CIE Lab of each pixel, three values per pixel. */
  lab: Float32Array;
  /** The person's opacity (0..255) per pixel, or null when the server could not find them. */
  person: Uint8Array | null;
};

/** How far a pixel's color may be from the clicked one, on the slider. */
export const DEFAULT_TOLERANCE = 14;
export const MIN_TOLERANCE = 4;
export const MAX_TOLERANCE = 40;

// Folds and shadows change a plain garment's lightness far more than its hue, so lightness may vary this
// many times further than color does.
const LIGHTNESS_SLACK = 3;

// The person's edge: a pixel at least this opaque in the person mask belongs to them.
const PERSON_CUTOFF = 128;

// Enclosed gaps up to this share of the photo are filled: specks of print, a deep crease. Larger ones are
// something on top of the garment, such as a hand.
const HOLE_SHARE = 0.004;

/** sRGB (0..255) to CIE Lab (D65). */
export const rgbToLab = (r: number, g: number, b: number): [number, number, number] => {
  const linear = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/** The photo as the selection works on it: its colors in Lab, worked out once. */
export const createSelectionPhoto = (
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  person: Uint8Array | null
): SelectionPhoto => {
  const lab = new Float32Array(width * height * 3);
  // A photo has far fewer distinct colors than pixels; each is converted once.
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < width * height; i++) {
    const key = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
    let value = cache.get(key);
    if (!value) {
      value = rgbToLab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      cache.set(key, value);
    }
    lab[i * 3] = value[0];
    lab[i * 3 + 1] = value[1];
    lab[i * 3 + 2] = value[2];
  }
  return { width, height, lab, person };
};

const isPerson = (photo: SelectionPhoto, index: number) =>
  !photo.person || photo.person[index] >= PERSON_CUTOFF;

// The clicked color, averaged over a few pixels so one noisy pixel does not set it.
const seedColor = (photo: SelectionPhoto, x: number, y: number): [number, number, number] => {
  let l = 0;
  let a = 0;
  let b = 0;
  let count = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= photo.width || py >= photo.height) continue;
      const index = py * photo.width + px;
      if (!isPerson(photo, index)) continue;
      l += photo.lab[index * 3];
      a += photo.lab[index * 3 + 1];
      b += photo.lab[index * 3 + 2];
      count++;
    }
  }
  const seed = y * photo.width + x;
  return count === 0
    ? [photo.lab[seed * 3], photo.lab[seed * 3 + 1], photo.lab[seed * 3 + 2]]
    : [l / count, a / count, b / count];
};

/**
 * The region of the clicked color around (x, y): pixels joined to it whose color is within `tolerance` of the
 * clicked one, on the person only. Every pixel is compared to the clicked color, not to its neighbour, so the
 * region can't drift along a gradient onto the skin.
 */
export const growRegion = (
  photo: SelectionPhoto,
  x: number,
  y: number,
  tolerance = DEFAULT_TOLERANCE
): SelectionMask => {
  const { width, height, lab } = photo;
  const region = new Uint8Array(width * height);
  const sx = Math.round(x);
  const sy = Math.round(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height || !isPerson(photo, sy * width + sx))
    return region;

  const [seedL, seedA, seedB] = seedColor(photo, sx, sy);
  const lightness = tolerance * LIGHTNESS_SLACK;
  const colorSquared = tolerance * tolerance;
  const matches = (index: number) => {
    if (!isPerson(photo, index)) return false;
    const da = lab[index * 3 + 1] - seedA;
    const db = lab[index * 3 + 2] - seedB;
    return da * da + db * db <= colorSquared && Math.abs(lab[index * 3] - seedL) <= lightness;
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const visit = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  visit(sy * width + sx);
  while (head < tail) {
    const index = queue[head++];
    if (!matches(index)) continue;
    region[index] = 1;
    const px = index % width;
    if (px > 0) visit(index - 1);
    if (px < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
  return fillSmallHoles(region, width, height);
};

/**
 * Fills the gaps a selection encloses when they are small (a speck, a crease too dark to match), so the
 * garment has no pinholes the print would show through.
 */
export const fillSmallHoles = (
  mask: SelectionMask,
  width: number,
  height: number,
  maximumShare = HOLE_SHARE
): SelectionMask => {
  const filled = mask.slice();
  const seen = new Uint8Array(width * height);
  const limit = Math.max(1, Math.floor(width * height * maximumShare));
  const queue = new Int32Array(width * height);
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] || seen[start]) continue;
    // Walk one gap; it is a hole when it never reaches the photo's edge.
    let head = 0;
    let tail = 0;
    let touchesEdge = false;
    const visit = (index: number) => {
      if (seen[index] || mask[index]) return;
      seen[index] = 1;
      queue[tail++] = index;
    };
    visit(start);
    while (head < tail) {
      const index = queue[head++];
      const px = index % width;
      const py = (index - px) / width;
      if (px === 0 || py === 0 || px === width - 1 || py === height - 1) touchesEdge = true;
      if (px > 0) visit(index - 1);
      if (px < width - 1) visit(index + 1);
      if (py > 0) visit(index - width);
      if (py < height - 1) visit(index + width);
    }
    if (!touchesEdge && tail <= limit) for (let i = 0; i < tail; i++) filled[queue[i]] = 1;
  }
  return filled;
};

/** Every pixel selected in either mask. */
export const unionMasks = (left: SelectionMask, right: SelectionMask): SelectionMask => {
  const result = new Uint8Array(left.length);
  for (let i = 0; i < left.length; i++) result[i] = left[i] || right[i] ? 1 : 0;
  return result;
};

/**
 * Paints a round brush along the line from one point to another: `value` 1 adds to the selection, 0 erases.
 * Adding stays on the person, so a stroke over the edge does not select the background.
 */
export const paintStroke = (
  mask: SelectionMask,
  photo: Pick<SelectionPhoto, "width" | "height" | "person">,
  from: { x: number; y: number },
  to: { x: number; y: number },
  radius: number,
  value: 0 | 1
): SelectionMask => {
  const { width, height, person } = photo;
  const result = mask.slice();
  const r = Math.max(0.5, radius);
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / Math.max(1, r / 2))
  );
  for (let step = 0; step <= steps; step++) {
    const cx = from.x + ((to.x - from.x) * step) / steps;
    const cy = from.y + ((to.y - from.y) * step) / steps;
    const left = Math.max(0, Math.floor(cx - r));
    const right = Math.min(width - 1, Math.ceil(cx + r));
    const top = Math.max(0, Math.floor(cy - r));
    const bottom = Math.min(height - 1, Math.ceil(cy + r));
    for (let py = top; py <= bottom; py++) {
      for (let px = left; px <= right; px++) {
        if ((px - cx) ** 2 + (py - cy) ** 2 > r * r) continue;
        const index = py * width + px;
        if (value === 1 && person && person[index] < PERSON_CUTOFF) continue;
        result[index] = value;
      }
    }
  }
  return result;
};

/** The share of the photo selected, 0..1. */
export const selectionCoverage = (mask: SelectionMask) => {
  let selected = 0;
  for (let i = 0; i < mask.length; i++) selected += mask[i];
  return mask.length === 0 ? 0 : selected / mask.length;
};

/** The opacity channel of RGBA pixels, as a person mask or a saved garment mask is read. */
export const alphaOf = (rgba: Uint8ClampedArray): Uint8Array => {
  const alpha = new Uint8Array(rgba.length / 4);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return alpha;
};

/** A saved garment mask's opacity as a selection to start editing from. */
export const selectionFromAlpha = (alpha: Uint8Array): SelectionMask => {
  const mask = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) mask[i] = alpha[i] >= 128 ? 1 : 0;
  return mask;
};

/** RGBA pixels of the selection as the server reads it: opaque white where selected, transparent elsewhere. */
export const selectionToRgba = (mask: SelectionMask) => {
  const rgba = new Uint8ClampedArray(new ArrayBuffer(mask.length * 4));
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
};

/** The box around the selection, in the selection's own pixels, or null when nothing is selected. */
export const selectionBounds = (mask: SelectionMask, width: number) => {
  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const x = i % width;
    const y = (i - x) / width;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

/**
 * A first print area for a shirt on a person: the chest, centered across the selected garment just below its
 * collar. In the photo's pixels; `scale` is the photo's size over the selection's.
 */
export const chestPrintArea = (
  bounds: { x: number; y: number; width: number; height: number },
  scale: number
) => {
  const width = bounds.width * 0.5;
  const height = Math.min(width * 1.25, bounds.height * 0.5);
  return {
    x: Math.round((bounds.x + (bounds.width - width) / 2) * scale),
    y: Math.round((bounds.y + bounds.height * 0.18) * scale),
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/** The size the editor works at: the photo scaled so its longest side is at most `maxSide`. */
export const editorSize = (photo: { width: number; height: number }, maxSide = 1600) => {
  const scale = Math.min(1, maxSide / Math.max(photo.width, photo.height));
  return {
    width: Math.max(1, Math.round(photo.width * scale)),
    height: Math.max(1, Math.round(photo.height * scale)),
  };
};

// A model photo's garment is white or light and has little color, unlike skin, hair and most trousers.
const GARMENT_MIN_LIGHTNESS = 65;
const GARMENT_MAX_CHROMA = 14;
// The garment is looked for on this part of the person's height: below the head, above the knees.
const SEARCH_FROM = 0.12;
const SEARCH_TO = 0.75;
// The garment found must run at least this share of the person's height down the middle of them.
const MIN_GARMENT_RUN = 0.05;
// Below this share of the photo, what was found is too small to be the garment.
const MIN_AUTO_COVERAGE = 0.01;

/**
 * Where to click to select the garment: the middle of the longest light, colorless stretch down the middle of the
 * person, which on a photo of a person in a white tee is their chest. Null when there is none.
 */
export const findGarmentSeed = (photo: SelectionPhoto): { x: number; y: number } | null => {
  const { width, height, lab, person } = photo;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let i = 0; i < width * height; i++) {
    if (!isPerson(photo, i)) continue;
    const x = i % width;
    const y = (i - x) / width;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (right < 0) return null;

  const personHeight = bottom - top + 1;
  const from = top + Math.floor(personHeight * SEARCH_FROM);
  const to = top + Math.ceil(personHeight * SEARCH_TO);
  const isGarmentLike = (x: number, y: number) => {
    const index = y * width + x;
    if (person && person[index] < PERSON_CUTOFF) return false;
    return (
      lab[index * 3] >= GARMENT_MIN_LIGHTNESS &&
      Math.hypot(lab[index * 3 + 1], lab[index * 3 + 2]) <= GARMENT_MAX_CHROMA
    );
  };

  // A few columns around the middle, so a zip, a button or a hand on the chest does not hide the garment.
  const middle = (left + right) / 2;
  const spread = Math.max(1, Math.round((right - left) * 0.05));
  let best: { x: number; start: number; length: number } | null = null;
  for (const x of [middle, middle - spread, middle + spread].map((value) => Math.round(value))) {
    if (x < 0 || x >= width) continue;
    let start = -1;
    for (let y = from; y <= Math.min(to, height - 1) + 1; y++) {
      const inside = y <= Math.min(to, height - 1) && isGarmentLike(x, y);
      if (inside && start < 0) start = y;
      if (!inside && start >= 0) {
        if (!best || y - start > best.length) best = { x, start, length: y - start };
        start = -1;
      }
    }
  }
  if (!best || best.length < personHeight * MIN_GARMENT_RUN) return null;
  return { x: best.x, y: best.start + Math.floor(best.length / 2) };
};

/**
 * The garment selected without a click: the region grown from {@link findGarmentSeed}. Null when no light
 * garment was found, or what was found is too small to be one; the seller then selects it by hand.
 */
export const autoSelectGarment = (
  photo: SelectionPhoto,
  tolerance = DEFAULT_TOLERANCE
): SelectionMask | null => {
  const seed = findGarmentSeed(photo);
  if (!seed) return null;
  const region = growRegion(photo, seed.x, seed.y, tolerance);
  return selectionCoverage(region) >= MIN_AUTO_COVERAGE ? region : null;
};
