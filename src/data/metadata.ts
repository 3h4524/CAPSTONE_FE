import type { Metadata } from "next";

import { SITE_CONFIG } from "@/constants/site";

export const getAbsoluteUrl = (pathname: string, origin: string = SITE_CONFIG.baseUrl) =>
  new URL(pathname, origin).toString();

/**
 * Base Metadata shared by every route. Call this from the root layout, then
 * let individual routes override `title`/`description`/`openGraph`/etc. via
 * their own `generateMetadata`, composing on top of this.
 */
export const getSiteMetadata = (): Metadata => {
  const canonical = getAbsoluteUrl("/");
  const ogImageUrl = getAbsoluteUrl("/opengraph-image");

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
    icons: {
      icon: [{ url: "/icons/favicon.svg", type: "image/svg+xml" }],
    },
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
    openGraph: {
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      url: canonical,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: SITE_CONFIG.name,
        },
      ],
      locale: SITE_CONFIG.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      images: [ogImageUrl],
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
  description,
  pathname,
}: {
  title: string;
  description: string;
  pathname: string;
}): Metadata => {
  const canonical = getAbsoluteUrl(pathname);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
    },
    twitter: {
      title,
      description,
    },
  };
};

