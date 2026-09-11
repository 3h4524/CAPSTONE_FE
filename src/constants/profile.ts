export const TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
] as const;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
] as const;

export const LANGUAGE_VALUES = ["en", "vi"] as const;

export const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export const THEME_VALUES = ["light", "dark", "system"] as const;

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
export const DEFAULT_LANGUAGE = "vi";
export const DEFAULT_THEME = "system";
