import type { Metadata } from "next";

import { SITE_CONFIG } from "@/constants/site";

export const getAbsoluteUrl = (pathname: string, origin: string = SITE_CONFIG.baseUrl) =>
  new URL(pathname, origin).toString();

const getShareImage = () => ({
  url: getAbsoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
});

const getBaseOpenGraph = () => ({
  siteName: SITE_CONFIG.name,
  images: [getShareImage()],
  locale: SITE_CONFIG.ogLocale,
  type: "website" as const,
});

const getBaseTwitter = () => ({
  card: "summary_large_image" as const,
  images: [getShareImage().url],
});

/**
 * Base Metadata shared by every route. Call this from the root layout, then
 * let individual routes override `title`/`description`/`openGraph`/etc. via
 * their own `generateMetadata`, composing on top of this.
 */
export const getSiteMetadata = (): Metadata => {
  const canonical = getAbsoluteUrl("/");

  return {
    applicationName: SITE_CONFIG.name,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    metadataBase: new URL(SITE_CONFIG.baseUrl),
    title: {
      default: SITE_CONFIG.name,
      template: `%s | ${SITE_CONFIG.name}`,
    },
    description: SITE_CONFIG.description,
    authors: [{ name: SITE_CONFIG.name, url: canonical }],
    creator: SITE_CONFIG.name,
    publisher: SITE_CONFIG.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical,
    },
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: [{ url: "/favicon.ico" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      ...getBaseOpenGraph(),
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      url: canonical,
    },
    twitter: {
      ...getBaseTwitter(),
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
    },
    appleWebApp: {
      title: SITE_CONFIG.name,
      statusBarStyle: "default",
      capable: true,
    },
  };
};

/**
 * Helper for per-route `generateMetadata` — composes a page-specific title
 * (via the template above) + description + canonical/OG on top of the site
 * default, without repeating the whole shape every time.
 */
export const getPageMetadata = ({
  title,
  description = SITE_CONFIG.description,
  pathname,
  robots,
}: {
  title: string;
  description?: string;
  pathname?: string;
  robots?: Metadata["robots"];
}): Metadata => {
  const canonical = pathname ? getAbsoluteUrl(pathname) : undefined;

  return {
    title,
    description,
    ...(robots ? { robots } : null),
    ...(canonical ? { alternates: { canonical } } : null),
    openGraph: {
      ...getBaseOpenGraph(),
      title,
      description,
      ...(canonical ? { url: canonical } : null),
    },
    twitter: {
      ...getBaseTwitter(),
      title,
      description,
    },
  };
};

