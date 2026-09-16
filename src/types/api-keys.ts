export type ApiKeyStatus = "Connected" | "Reconnect" | "Needs attention";

export type ApiKeyConnection = {
  id: string;
  provider: string;
  providerCategory: string;
  authType: "API Key" | "OAuth";
  label: string;
  credential: string;
  environment: string | null;
  status: ApiKeyStatus;
  lastUsedAtUtc: string | null;
  lastCheckedAtUtc: string | null;
};

export type ApiKeyOverview = {
  items: ApiKeyConnection[];
  connectedCount: number;
  needsAttentionCount: number;
  isReady: boolean;
  lastCheckedAtUtc: string | null;
};
