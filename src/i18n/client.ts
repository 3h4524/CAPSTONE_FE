"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { type AppLocale, resources } from "@/i18n/resources";

const defaultLocale: AppLocale = "en";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    supportedLngs: Object.keys(resources),
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export const normalizeLocale = (value: string | null | undefined): AppLocale =>
  value?.toLowerCase().startsWith("vi") ? "vi" : "en";

export const getCurrentLocale = (): AppLocale => normalizeLocale(i18n.language);

export const changeAppLanguage = async (value: string | null | undefined) => {
  const locale = normalizeLocale(value);
  await i18n.changeLanguage(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    window.localStorage.setItem("apcs-language", locale);
  }
  return locale;
};

export { i18n };
