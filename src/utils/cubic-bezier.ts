const sample = (a: number, b: number, t: number) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;

const slope = (a: number, b: number, t: number) => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;

export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => (progress: number) => {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let t = progress;
  for (let step = 0; step < 8; step++) {
    const error = sample(x1, x2, t) - progress;
    const gradient = slope(x1, x2, t);
    if (Math.abs(error) < 1e-5 || gradient === 0) break;
    t -= error / gradient;
  }
  return sample(y1, y2, Math.min(1, Math.max(0, t)));
};
