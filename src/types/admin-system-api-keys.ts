export type SystemApiKeyProviderName = "ideogram" | "minimax";

export type SystemApiKeyStrategy = "fill" | "rotate";

/** One platform key, without the key itself. */
export type AdminSystemApiKey = {
  id: string;
  provider: SystemApiKeyProviderName;
  label: string;
  /** The last four characters after asterisks, e.g. "****9876". */
  maskedKey: string;
  /** The short id the key's use is counted and logged under. */
  keyId: string;
  isActive: boolean;
  usedToday: number;
  /** Why the provider refused the key today, or null while it is in use. */
  refusedToday: string | null;
  /** Whether the server that answered can decrypt the key; one it cannot is not used. */
  readable: boolean;
  lastCheckedAt: string | null;
  lastCheckSucceeded: boolean | null;
  createdAt: string;
  /** Sent back with a change, so another Admin's change since is not overwritten. */
  updatedAt: string;
};

/** One provider's limits and keys. */
export type AdminSystemApiKeyProvider = {
  provider: SystemApiKeyProviderName;
  name: string;
  dailyLimitPerKey: number | null;
  maxConcurrentPerKey: number | null;
  strategy: SystemApiKeyStrategy;
  updatedAt: string;
  /** In the order fill takes them. */
  keys: AdminSystemApiKey[];
};

export type AdminSystemApiKeys = {
  providers: AdminSystemApiKeyProvider[];
  /** False while the database has no key tables yet (the migration has not reached it). */
  storageReady: boolean;
};

export type AddSystemApiKeyInput = {
  provider: SystemApiKeyProviderName;
  label: string;
  key: string;
};

export type UpdateSystemApiKeyInput = {
  label: string;
  isActive: boolean;
  updatedAt: string;
};

export type UpdateSystemApiKeyProviderInput = {
  dailyLimitPerKey: number | null;
  maxConcurrentPerKey: number | null;
  strategy: SystemApiKeyStrategy;
  updatedAt: string;
};
