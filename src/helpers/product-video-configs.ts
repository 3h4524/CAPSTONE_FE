import type { WorkflowNodeConfig } from "@/types/workflow";

/**
 * Generate Video settings of their own for some products of the batch, set before a run, kept in the node's shared
 * settings under `productConfigs` (product id to a whole Generate Video config). When the batch video run starts,
 * every design of such a product renders with them; a design given settings at Mockup Approval keeps its own.
 */
export const PRODUCT_CONFIGS_KEY = "productConfigs";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const productScopeKey = (productId: string) => `product:${productId}`;

export const readProductConfigs = (config: WorkflowNodeConfig | undefined): Record<string, WorkflowNodeConfig> => {
  const value = config?.[PRODUCT_CONFIGS_KEY];
  return isRecord(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, WorkflowNodeConfig] => isRecord(entry[1])))
    : {};
};

/** The shared settings as one product's video uses them: without the other products' own settings. */
export const withoutProductConfigs = (config: WorkflowNodeConfig): WorkflowNodeConfig => {
  const { [PRODUCT_CONFIGS_KEY]: _ignored, ...rest } = config;
  return rest;
};

/** Gives a product its own settings, or puts it back on the shared ones (`own` null). */
export const withProductConfig = (
  shared: WorkflowNodeConfig,
  productId: string,
  own: WorkflowNodeConfig | null
): WorkflowNodeConfig => {
  const { [productId]: _previous, ...others } = readProductConfigs(shared);
  const next = own ? { ...others, [productId]: withoutProductConfigs(own) } : others;
  const base = withoutProductConfigs(shared);
  return Object.keys(next).length > 0 ? { ...base, [PRODUCT_CONFIGS_KEY]: next } : base;
};

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : isRecord(value)
      ? Object.fromEntries(
          Object.keys(value)
            .filter((key) => value[key] !== undefined)
            .sort()
            .map((key) => [key, canonical(value[key])])
        )
      : value;

/** Whether two settings are the same, whatever order their keys were written in. */
export const sameConfig = (left: WorkflowNodeConfig | undefined, right: WorkflowNodeConfig | undefined) =>
  JSON.stringify(canonical(left ?? {})) === JSON.stringify(canonical(right ?? {}));
