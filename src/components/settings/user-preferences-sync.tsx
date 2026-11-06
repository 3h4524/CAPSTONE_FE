"use client";

import { useEffect } from "react";

import { applyUserPreferences } from "@/helpers/user-preferences";
import { useProfile } from "@/hooks/queries/use-profile";

export const UserPreferencesSync = () => {
  const { data } = useProfile();

  useEffect(() => {
    if (!data) return;
    applyUserPreferences(data);
  }, [data]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handleChange = () => {
      const theme = document.documentElement.dataset.theme;
      if (theme === "system") {
        document.documentElement.classList.toggle("dark", media.matches);
      }
    };
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  return null;
};
