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

export const buildEffectivePrompt = (components: PromptComponents) => {
  const source = components.basePrompt ?? "";
  const usedSubject = hasPlaceholder(source, "subject");
  const usedStyle = hasPlaceholder(source, "style");

  const resolved = source
    .replace(/\{subject\}/gi, components.subject.trim())
    .replace(/\{niche\}/gi, components.niche.trim())
    .replace(/\{style\}/gi, components.artStyle.trim());

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
