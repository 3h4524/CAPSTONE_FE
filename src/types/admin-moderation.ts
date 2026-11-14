// Shapes of /api/admin/moderation (APCS.Application.Features.Admin.Moderation.Dtos).

export type ModerationDecision = "allow" | "flagged" | "block" | "unchecked";
export type ModerationDecider = "blocklist" | "gemini" | "provider_safety" | "error" | "disabled";
export type ModerationDirection = "input" | "output";
export type ModerationCategory =
  | "sexual"
  | "sexual_minors"
  | "violence_gore"
  | "hate"
  | "self_harm"
  | "illegal"
  | "ip_trademark";
export type ModerationTermSeverity = "block" | "flag";
export type ModerationMatchType = "word" | "phrase";
export type ModerationThreshold = "high" | "medium";
export type ModerationRangeDays = 7 | 30 | 90;

export type ModerationTotals = {
  checks: number;
  allowed: number;
  flagged: number;
  blocked: number;
  unchecked: number;
  blockRate: number;
  averageLatencyMs: number | null;
};

export type ModerationDailyPoint = {
  date: string;
  allowed: number;
  flagged: number;
  blocked: number;
  unchecked: number;
};

export type ModerationCategoryCount = { category: ModerationCategory; blocked: number; flagged: number };
export type ModerationCount = { key: string; count: number };
export type ModerationFeatureCount = { feature: string; checks: number; blocked: number };

export type ModerationOverview = {
  storageReady: boolean;
  days: number;
  totals: ModerationTotals;
  daily: ModerationDailyPoint[];
  byCategory: ModerationCategoryCount[];
  byDecider: ModerationCount[];
  byFeature: ModerationFeatureCount[];
  byDirection: ModerationCount[];
};

export type ModerationOffender = {
  userId: string;
  email: string;
  fullName: string;
  blocked: number;
  flagged: number;
  lastBlockedAt: string;
  topCategory: ModerationCategory | null;
};

export type ModerationFinding = {
  category: ModerationCategory;
  severity: "low" | "medium" | "high";
  field: string | null;
  evidence: string | null;
};

export type ModerationCheckListItem = {
  id: string;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  feature: string;
  direction: ModerationDirection;
  subjectType: string;
  decision: ModerationDecision;
  decidedBy: ModerationDecider;
  categories: ModerationCategory[];
  excerptPreview: string | null;
  latencyMs: number | null;
};

export type ModerationCheckDetail = Omit<ModerationCheckListItem, "categories" | "excerptPreview"> & {
  subjectId: string | null;
  findings: ModerationFinding[];
  reason: string | null;
  contentExcerpt: string | null;
  model: string | null;
  policyVersion: number;
  contentHash: string;
};

export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type ModerationCheckFilter = {
  page: number;
  pageSize: number;
  decision?: ModerationDecision;
  decidedBy?: ModerationDecider;
  feature?: string;
  direction?: ModerationDirection;
  category?: ModerationCategory;
  search?: string;
  from?: string;
  to?: string;
};

export type ModerationTerm = {
  id: string;
  term: string;
  category: ModerationCategory;
  severity: ModerationTermSeverity;
  matchType: ModerationMatchType;
  matchUnaccented: boolean;
  language: "en" | "vi";
  isActive: boolean;
  note: string | null;
  updatedAt: string;
};

export type ModerationTermFilter = {
  search?: string;
  category?: ModerationCategory;
  severity?: ModerationTermSeverity;
  active?: boolean;
};

export type SaveModerationTermInput = {
  term: string;
  category: ModerationCategory;
  severity: ModerationTermSeverity;
  matchType: ModerationMatchType;
  matchUnaccented: boolean;
  language: "en" | "vi";
  isActive: boolean;
  note: string | null;
};

export type ModerationAllowlistItem = {
  id: string;
  phrase: string;
  isActive: boolean;
  note: string | null;
  updatedAt: string;
};

export type SaveModerationAllowlistInput = { phrase: string; isActive: boolean; note: string | null };

export type ModerationThresholdSetting = {
  category: ModerationCategory;
  blockAt: ModerationThreshold | "any";
  locked: boolean;
};

export type ModerationSettings = {
  storageReady: boolean;
  configEnabled: boolean;
  geminiConfigured: boolean;
  enabled: boolean;
  thresholds: ModerationThresholdSetting[];
  model: string;
  policyVersion: number;
  updatedAt: string | null;
  updatedByEmail: string | null;
};

export type UpdateModerationSettingsInput = {
  enabled: boolean;
  blockAt: Partial<Record<ModerationCategory, ModerationThreshold>>;
};
