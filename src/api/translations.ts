import { api } from "@/api/client";

export type TranslationItem = { key: string; text: string };

export type TranslationResult = {
  key: string;
  text: string;
  isTranslated: boolean;
  isCached: boolean;
};

export const translateTexts = async ({
  items,
  sourceLocale = "en",
  targetLocale,
}: {
  items: TranslationItem[];
  sourceLocale?: string;
  targetLocale: string;
}): Promise<TranslationResult[]> => {
  if (!items.length || sourceLocale === targetLocale) {
    return items.map((item) => ({
      key: item.key,
      text: item.text,
      isTranslated: false,
      isCached: false,
    }));
  }

  const { data } = await api.post<{ items: TranslationResult[] }>("/api/translations", {
    sourceLocale,
    targetLocale,
    items,
  });
  return data.items;
};
