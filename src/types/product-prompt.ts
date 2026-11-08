export interface BatchProductPrompt {
  rowId: string;
  subject: string;
  artStyle: string;
  moodTone: string;
  negativeTerms: string;
  instructions: string;
  defaultEffectivePrompt: string;
  defaultBasePrompt: string;
  defaultNiche: string;
  defaultStyleModifiers: string;
  effectivePrompt: string;
  characterCount: number;
  isCustomized: boolean;
  canEdit: boolean;
  /** The product's own image prompt, which replaces the design template; null when it has none. */
  customPrompt?: string | null;
  /** The motifs the design draws from the product's keywords, comma-separated; null with the product's own image prompt. */
  motifs?: string | null;
  /** What of the product's keywords the design leaves out; null with the product's own image prompt. */
  ignoredKeywords?: string[] | null;
}

export type UpdateBatchProductPromptInput = {
  subject: string;
  artStyle: string;
  moodTone: string;
  negativeTerms: string;
  instructions: string;
  /** The product's own image prompt: left out keeps it as it is, empty removes it. */
  customPrompt?: string;
};
