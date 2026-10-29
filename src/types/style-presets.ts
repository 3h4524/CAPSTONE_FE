export interface StylePreset {
  id: string;
  name: string;
  description: string;
  styleModifiers: string;
  previewImageUrl: string | null;
  recommendations: string[];
  isSystemTemplate: boolean;
  isMine: boolean;
  usageCount: number;
}
