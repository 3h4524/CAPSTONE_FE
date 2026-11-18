import { useTranslation } from "react-i18next";

const NOTE_KEYS = [
  "admin.imageQuality.live.notes.reviewOnly",
  "admin.imageQuality.live.notes.failedBlocked",
  "admin.imageQuality.live.notes.byDateNote",
  "admin.imageQuality.live.notes.noRating",
] as const;

export const LiveNotes = () => {
  const { t } = useTranslation("common");

  return (
    <section className="border-ink-200 bg-ink-50 rounded-xl border px-5 py-4 max-md:px-4 sm:px-6">
      <h3 className="text-ink-800 text-sm font-semibold">{t("admin.imageQuality.live.notes.title")}</h3>
      <ul className="text-ink-600 mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed">
        {NOTE_KEYS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </section>
  );
};
