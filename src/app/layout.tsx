import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { CostConfirmDialog } from "@/components/commons/popup/cost-confirm-dialog";
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

// The app ships in Vietnamese too: without the latin-ext and vietnamese subsets, accented letters fall
// back to another font mid-word. The browser only downloads the ranges a page actually uses.
// next/font needs literal options, so the subset list is written out in each call.
// Plus Jakarta Sans is the system font: body text, controls and headings.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-jakarta",
  display: "swap",
});

// Inter stays only inside the workflow canvas (`font-canvas`), where node text is 8 to 11px and
// Inter reads more clearly at that size.
const inter = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = getSiteMetadata();

export const viewport: Viewport = {
  themeColor: SITE_CONFIG.themeColor,
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
      <body className={`${jakarta.variable} ${inter.variable} font-sans antialiased`}>
        <I18nProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </I18nProvider>
        <GlobalToast />
        <GlobalPopup />
        <CostConfirmDialog />
        {process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
