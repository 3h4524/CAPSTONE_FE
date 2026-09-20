export type DesignTemplateScope = "system" | "personal";

export type DesignTemplateExample = {
  subject: string;
  prompt: string;
};

export type DesignTemplateSummary = {
  id: string;
  name: string;
  nicheCategory: string | null;
  artStyle: string | null;
  styleDescription: string | null;
  previewImageUrl: string | null;
  isSystemTemplate: boolean;
  usageCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  canEdit: boolean;
  canDelete: boolean;
  canClone: boolean;
};

export type DesignTemplateDetail = DesignTemplateSummary & {
  basePrompt: string;
  negativePrompt: string | null;
  examples: DesignTemplateExample[];
};

export type DesignTemplateOption = {
  value: string;
  label: string;
};

export type DesignTemplateOptions = {
  niches: DesignTemplateOption[];
  artStyles: DesignTemplateOption[];
  placeholders: string[];
  maximumBasePromptLength: number;
  maximumExamples: number;
  previewGenerationEnabled: boolean;
};

export type DesignTemplateFilters = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  nicheCategory?: string;
  artStyle?: string;
  scope: DesignTemplateScope;
};

export type DesignTemplateInput = {
  name: string;
  nicheCategory: string;
  artStyle: string;
  basePrompt: string;
  negativePrompt?: string;
  examples: DesignTemplateExample[];
};

export type PagedDesignTemplates = {
  items: DesignTemplateSummary[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};
