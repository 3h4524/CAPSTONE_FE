import { api } from "@/api/client";
import type { MockupTemplatePrintifyLink } from "@/types/mockup-templates";

/** A system mock-up template as an Admin manages it, with the Printify product its photo shows. */
export type AdminMockupTemplate = {
  id: string;
  name: string;
  productType: string;
  kind: string;
  baseImageUrl: string;
  previewImageUrl: string | null;
  isActive: boolean;
  printify: MockupTemplatePrintifyLink | null;
};

export type LinkMockupTemplatePrintifyInput = {
  blueprintId: number;
  blueprintTitle: string;
  blueprintImageUrl: string | null;
  printProviderId: number | null;
  printProviderTitle: string | null;
  defaultSizes: string[];
};

export const adminMockupTemplateKeys = {
  all: ["admin", "mockup-templates"] as const,
};

export const getAdminMockupTemplates = async (): Promise<AdminMockupTemplate[]> =>
  (await api.get<AdminMockupTemplate[]>("/api/admin/mockup-templates")).data;

export const linkMockupTemplatePrintify = async ({ id, input }: { id: string; input: LinkMockupTemplatePrintifyInput }): Promise<AdminMockupTemplate> =>
  (await api.put<AdminMockupTemplate>(`/api/admin/mockup-templates/${id}/printify`, input)).data;

export const unlinkMockupTemplatePrintify = async (id: string): Promise<void> => {
  await api.delete(`/api/admin/mockup-templates/${id}/printify`);
};
