export interface AdminStyleArtPresetVi {
  name: string;
  description: string;
  recommendations: string[];
}

export type AdminStyleArtPresetViStatus = "ok" | "pending" | "failed" | "manual";

export interface AdminStyleArtPreset {
  id: string;
  name: string;
  description: string;
  styleModifiers: string;
  previewImageUrl: string | null;
  recommendations: string[];
  isActive: boolean;
  usageCount: number;
  vi: AdminStyleArtPresetVi | null;
  viStatus: AdminStyleArtPresetViStatus | null;
}
