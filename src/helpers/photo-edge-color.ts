/**
 * The color around a photo's edge: the median of its border pixels, read from a small copy. Fills the space beside
 * a photo shown whole in a frame of another shape, so the frame looks like part of the photo. Null when the photo
 * cannot be read (served without CORS, not loaded) or its edge is transparent.
 */
export const photoEdgeColor = (image: HTMLImageElement): string | null => {
  const size = 32;
  try {
    if (!image.naturalWidth || !image.naturalHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);

    const red: number[] = [];
    const green: number[] = [];
    const blue: number[] = [];
    for (let i = 0; i < size; i++) {
      for (const [x, y] of [[i, 0], [i, size - 1], [0, i], [size - 1, i]]) {
        const pixel = (y * size + x) * 4;
        if (data[pixel + 3] < 128) continue;
        red.push(data[pixel]);
        green.push(data[pixel + 1]);
        blue.push(data[pixel + 2]);
      }
    }
    // A mostly transparent edge (a cut-out PNG) has no backdrop color to match.
    if (red.length < size * 2) return null;
    // The median ignores a garment or shadow that touches the edge.
    const median = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1];
    return `rgb(${median(red)} ${median(green)} ${median(blue)})`;
  } catch {
    // A photo from a host without CORS taints the canvas, and reading it throws.
    return null;
  }
};
