import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { GlobalPopup } from "@/components/commons/popup/global-popup";
import { GlobalToast } from "@/components/commons/toast/global-toast";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { SITE_CONFIG } from "@/constants/site";
import { getSiteMetadata } from "@/data/metadata";
import { THEME_BOOT_SCRIPT } from "@/helpers/theme";
import { I18nProvider } from "@/providers/global/i18n-provider";
import { ReactQueryProvider } from "@/providers/global/query-client-provider";
import { GoogleAnalytics } from "@next/third-parties/google";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = getSiteMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_CONFIG.locale} suppressHydrationWarning>
      <head>
        {/* Paints the signed-in user's last theme before hydration so dark mode never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <OrganizationJsonLd />
      </head>
      <body className={`${inter.variable} ${display.variable} font-sans antialiased`}>
        <I18nProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </I18nProvider>
        <GlobalToast />
        <GlobalPopup />
        {process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
