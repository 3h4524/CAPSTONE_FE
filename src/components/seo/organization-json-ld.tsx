import { JsonLdScripts } from "@/components/seo/json-ld-scripts";
import { SITE_CONFIG } from "@/constants/site";
import { getAbsoluteUrl } from "@/data/metadata";

/**
 * Site-wide JSON-LD graph: Organization + WebSite with stable `@id`s so other
 * pages' structured data can cross-reference them. Add a `Person`,
 * `LocalBusiness`, etc. block here if this site represents one.
 */
export const OrganizationJsonLd = () => {
  const websiteUrl = getAbsoluteUrl("/");
  const organizationId = `${websiteUrl}#organization`;
  const websiteId = `${websiteUrl}#website`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_CONFIG.name,
        url: websiteUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_CONFIG.name,
        url: websiteUrl,
        inLanguage: SITE_CONFIG.locale,
        publisher: { "@id": organizationId },
      },
    ],
  };

  return <JsonLdScripts values={[structuredData]} />;
};
