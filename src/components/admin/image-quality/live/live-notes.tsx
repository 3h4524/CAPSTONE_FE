const NOTES = [
  "Approved on review only counts jobs that asked for a review. Jobs that skip review approve every image by themselves, so they are left out of that rate.",
  "Failed or blocked counts every attempt that saved no image. Most early failures were API key and quota problems, not the prompt.",
  "Rows marked “by date” were made before images carried their prompt version, so the version comes from the day they were made.",
  "Sellers never rate designs today, so no rating is shown. For text and layout quality, use the evaluation runs.",
] as const;

export const LiveNotes = () => (
  <section className="border-ink-200 bg-ink-50 rounded-xl border px-5 py-4 max-md:px-4 sm:px-6">
    <h3 className="text-ink-800 text-sm font-semibold">How to read these numbers</h3>
    <ul className="text-ink-600 mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed">
      {NOTES.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  </section>
);
