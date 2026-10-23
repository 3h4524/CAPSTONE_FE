export type PromptComponents = {
  basePrompt: string;
  subject: string;
  artStyle: string;
  moodTone: string;
  negativeTerms: string;
  instructions: string;
  niche: string;
  styleModifiers: string;
};

const normalize = (value: string) => value.trim();

const hasPlaceholder = (source: string, name: string) => source.toLowerCase().includes(`{${name}}`);

// The sentence the server adds to a product's own image prompt when it has words to print (PromptDefaultsResolver).
const CUSTOM_PHRASE_SENTENCE = 'The design prints the exact phrase "{subject}".';

/** The base of a prompt made from the product's own image prompt, as the server builds it. */
export const customBasePrompt = (customPrompt: string, subject: string) =>
  subject.trim() ? `${customPrompt.trimEnd()} ${CUSTOM_PHRASE_SENTENCE}` : customPrompt;

export const buildEffectivePrompt = (components: PromptComponents) => {
  const source = components.basePrompt ?? "";
  const usedSubject = hasPlaceholder(source, "subject");
  const usedStyle = hasPlaceholder(source, "style");

  // An empty value leaves two spaces where it was; they are closed up, as the server does.
  const resolved = source
    .replace(/\{subject\}/gi, components.subject.trim())
    .replace(/\{niche\}/gi, components.niche.trim())
    .replace(/\{style\}/gi, components.artStyle.trim())
    .replace(/[ \t]{2,}/g, " ");

  const parts = [resolved.trim()];
  if (!usedSubject && normalize(components.subject).length > 0) parts.push(normalize(components.subject));
  if (!usedStyle && normalize(components.artStyle).length > 0) parts.push(normalize(components.artStyle));
  parts.push(normalize(components.moodTone), normalize(components.instructions));
  let combined = parts.filter((part) => part.length > 0).join(", ");

  if (normalize(components.styleModifiers).length > 0) {
    combined = combined.length > 0 ? `${combined}, ${normalize(components.styleModifiers)}` : normalize(components.styleModifiers);
  }

  if (normalize(components.negativeTerms).length > 0) {
    combined += `\nNegative prompt: ${normalize(components.negativeTerms)}`;
  }

  return combined;
};
