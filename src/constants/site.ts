// ============================================================================
// SITE CONFIGURATION
// Central place for site-wide constants
// ============================================================================

export const SITE_CONFIG = {
  /**
   * Display name of the site/company — used in the title template, footer,
   * and JSON-LD.
   */
  name: "Your Company",

  /**
   * One-sentence description used as the default meta description.
   */
  description: "A short, honest sentence about what you do.",

  /**
   * Base URL of the website (used for SEO, sitemap, canonical URLs).
   * Replace with the real production domain before deploying.
   */
  baseUrl: "https://example.com",

  /**
   * Single locale for this template (no i18n routing).
   */
  locale: "en",
} as const;
