import en from "@/i18n/locales/en.json";
import vi from "@/i18n/locales/vi.json";

export const resources = { en, vi } as const;

export type AppLocale = keyof typeof resources;
