import { JsonLdScripts } from "@/components/seo/json-ld-scripts";
import { FAQS } from "@/data/landing-content";

export const FaqJsonLd = () => {
  if (FAQS.length === 0) return null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return <JsonLdScripts values={[structuredData]} />;
};
