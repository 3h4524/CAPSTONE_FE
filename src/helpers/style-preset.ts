export const toRecommendationLines = (recommendations: string[]) => recommendations.join("\n");

export const fromRecommendationLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const PREVIEW_FALLBACKS = [
  "from-amber-200 via-orange-100 to-rose-200",
  "from-slate-200 via-slate-100 to-zinc-200",
  "from-sky-200 via-cyan-100 to-teal-100",
  "from-violet-200 via-purple-100 to-fuchsia-100",
  "from-emerald-200 via-green-100 to-lime-100",
  "from-indigo-200 via-blue-100 to-sky-100",
];

export const previewFallbackFor = (id: string) => {
  const hash = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
  return PREVIEW_FALLBACKS[hash % PREVIEW_FALLBACKS.length];
};
