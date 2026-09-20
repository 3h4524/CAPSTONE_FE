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
}

export type UpdateBatchProductPromptInput = {
  subject: string;
  artStyle: string;
  moodTone: string;
  negativeTerms: string;
  instructions: string;
};
