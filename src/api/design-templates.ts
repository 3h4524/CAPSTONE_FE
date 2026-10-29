import { api } from "@/api/client";
import type {
  DesignTemplateDetail,
  DesignTemplateFilters,
  DesignTemplateInput,
  DesignTemplateOptions,
  DesignTemplateScope,
  PagedDesignTemplates,
} from "@/types/design-template";

export const designTemplateKeys = {
  all: ["design-templates"] as const,
  lists: () => [...designTemplateKeys.all, "list"] as const,
  listsByScope: (scope: DesignTemplateScope) =>
    [...designTemplateKeys.lists(), scope] as const,
  list: (filters: DesignTemplateFilters) =>
    [...designTemplateKeys.listsByScope(filters.scope), filters] as const,
  details: () => [...designTemplateKeys.all, "detail"] as const,
  detail: (id: string) => [...designTemplateKeys.details(), id] as const,
  options: () => [...designTemplateKeys.all, "options"] as const,
};

export async function listDesignTemplates(
  filters: DesignTemplateFilters
): Promise<PagedDesignTemplates> {
  const { data } = await api.get<PagedDesignTemplates>("/api/design-templates", {
    params: filters,
  });
  return data;
}

export async function getDesignTemplate(id: string): Promise<DesignTemplateDetail> {
  const { data } = await api.get<DesignTemplateDetail>(`/api/design-templates/${id}`);
  return data;
}

export async function getDesignTemplateOptions(): Promise<DesignTemplateOptions> {
  const { data } = await api.get<DesignTemplateOptions>("/api/design-templates/options");
  return data;
}

export async function createDesignTemplate(
  input: DesignTemplateInput
): Promise<DesignTemplateDetail> {
  const { data } = await api.post<DesignTemplateDetail>("/api/design-templates", input);
  return data;
}

export async function updateDesignTemplate(input: {
  id: string;
  template: DesignTemplateInput;
}): Promise<DesignTemplateDetail> {
  const { data } = await api.put<DesignTemplateDetail>(
    `/api/design-templates/${input.id}`,
    input.template
  );
  return data;
}

export async function cloneDesignTemplate(id: string): Promise<DesignTemplateDetail> {
  const { data } = await api.post<DesignTemplateDetail>(`/api/design-templates/${id}/clone`);
  return data;
}

export async function deleteDesignTemplate(id: string): Promise<void> {
  await api.delete(`/api/design-templates/${id}`);
}
