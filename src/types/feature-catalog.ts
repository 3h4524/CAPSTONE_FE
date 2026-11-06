// A plan feature as the catalog shows it. The code and kind are fixed by the backend; the rest is
// what the Admin set up.
export type FeatureCatalogItem = {
  code: string;
  label: string;
  description: string;
  group: string;
  kind: "flag" | "limit";
  // For a limit, what it counts, such as "per day"; otherwise null.
  unit: string | null;
  sortOrder: number;
};

// The Admin's view of a feature, with the plans that include it.
export type AdminFeature = FeatureCatalogItem & {
  // For a limit, the value offered when adding it to a plan; null for no limit.
  defaultLimit: number | null;
  trialAvailable: boolean;
  // False hides it when adding features to a plan; plans that have it keep it.
  isActive: boolean;
  plans: string[];
  updatedAt: string | null;
  updatedByName: string | null;
};

export type UpdateFeatureInput = {
  label: string;
  description: string;
  group: string;
  unit: string | null;
  defaultLimit: number | null;
  trialAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
};
