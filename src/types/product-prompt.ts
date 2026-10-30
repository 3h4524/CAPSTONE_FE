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
