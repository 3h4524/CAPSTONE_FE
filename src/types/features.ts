import type { LucideIcon } from "lucide-react";

export type FeatureVisualKind =
  | "designs"
  | "video"
  | "listing"
  | "batch"
  | "platforms";

export interface FeatureDetail {
  id: string;
  icon: LucideIcon;
  visual: FeatureVisualKind;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
}

export interface BatchRow {
  name: string;
  status: string;
  progressClass: string;
  badgeVariant: "default" | "secondary" | "outline";
}

export interface DesignTile {
  icon: LucideIcon;
  label: string;
  tileClass: string;
}

export interface ConnectedPlatform {
  icon: LucideIcon;
  name: string;
  detail: string;
}
