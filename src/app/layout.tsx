import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { GlobalToast } from "@/components/commons/toast/global-toast";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { SITE_CONFIG } from "@/constants/site";
import { getSiteMetadata } from "@/data/metadata";
import { ReactQueryProvider } from "@/providers/global/query-client-provider";
import { GoogleAnalytics } from "@next/third-parties/google";

import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = getSiteMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_CONFIG.locale}>
      <head>
        <OrganizationJsonLd />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <GlobalToast />
        {process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
