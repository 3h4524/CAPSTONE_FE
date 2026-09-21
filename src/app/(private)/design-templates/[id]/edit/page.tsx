import type { Metadata } from "next";

import { DesignTemplateEditor } from "@/components/design-templates/design-template-editor";
import { getPageMetadata } from "@/data/metadata";

export const metadata: Metadata = getPageMetadata({
  title: "Edit Design Template",
  description: "Customize a personal design prompt template.",
  pathname: "/design-templates",
  robots: { index: false, follow: false },
});

type EditDesignTemplatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDesignTemplatePage({ params }: EditDesignTemplatePageProps) {
  const { id } = await params;
  return <DesignTemplateEditor templateId={id} />;
}
