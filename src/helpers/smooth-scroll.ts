const scrollParentOf = (element: HTMLElement): HTMLElement => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Frame-by-frame scroll, used where native `scrollIntoView({ behavior: "smooth" })` jumps instead of
// animating. The target is re-measured every frame, so content that loads mid-scroll doesn't throw it off.
export const smoothScrollTo = (element: HTMLElement, { duration = 600, offset = 16 } = {}) => {
  const container = scrollParentOf(element);
  const isPage = container === document.scrollingElement || container === document.documentElement;
  const start = container.scrollTop;
  const startedAt = performance.now();

  const step = (now: number) => {
    if (!element.isConnected) return;
    const containerTop = isPage ? 0 : container.getBoundingClientRect().top;
    const target = container.scrollTop + element.getBoundingClientRect().top - containerTop - offset;
    const progress = Math.min(1, (now - startedAt) / duration);
    container.scrollTop = start + (target - start) * easeInOut(progress);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
