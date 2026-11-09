const PREVIEW_FALLBACKS = [
  "from-amber-200 via-orange-100 dark:via-orange-500/15 to-rose-200",
  "from-ink-200 via-ink-100 to-ink-200",
  "from-sky-200 via-cyan-100 dark:via-cyan-500/15 to-teal-100 dark:to-teal-500/15",
  "from-violet-200 via-purple-100 dark:via-purple-500/15 to-fuchsia-100 dark:to-fuchsia-500/15",
  "from-emerald-200 via-green-100 dark:via-green-500/15 to-lime-100 dark:to-lime-500/15",
  "from-indigo-200 via-blue-100 dark:via-blue-500/15 to-sky-100 dark:to-sky-500/15",
];

export const previewFallbackFor = (id: string) => {
  const hash = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return PREVIEW_FALLBACKS[hash % PREVIEW_FALLBACKS.length];
};
