import type { AiCharacterCatalogItem } from "@/types/video-workflow";

export type AiCharacter = AiCharacterCatalogItem;

export const aiCharacterLabel = (character: AiCharacter) =>
  `${character.continent} · ${character.gender} · ${character.ageMin}–${character.ageMax} · ${character.bodyType} · ${character.skinTone}`;

export const getAiCharacter = (
  characters: readonly AiCharacter[],
  idOrLegacyCode: string | null | undefined
) =>
  characters.find(
    (character) => character.id === idOrLegacyCode || character.code === idOrLegacyCode
  ) ??
  characters.find((character) => character.isDefault) ??
  characters[0];
