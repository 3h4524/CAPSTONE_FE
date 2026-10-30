import { getAllowancesRequest } from "@/api/allowances";
import { apiKeyKeys, listApiKeys } from "@/api/api-keys";
import { batchJobKeys, getBatchJob, listBatchJobs } from "@/api/batch-jobs";
import { approveBatch, batchKeys, listBatchProducts } from "@/api/batches";
import { listMockupTemplates, mockupTemplateKeys } from "@/api/mockup-templates";
import { getEntitlementsRequest } from "@/api/subscription";
import { allowanceBlocksRun } from "@/helpers/allowance";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { featureLimit, hasFeature } from "@/helpers/plan-features";
import { ACTIVE_JOB_STATUSES, narrowMockupSelection, type RunPlan } from "@/helpers/workflow-run";
import { ALLOWANCES_QUERY_KEY } from "@/hooks/queries/use-allowances";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import type { Entitlements } from "@/types/subscription";
import type { QueryClient } from "@tanstack/react-query";

// A problem the user can fix; its message is shown as is.
export class RunBlockedError extends Error {}

// Every product of the batch already has its designs. Not a problem when the run only needs to go on to the video.
export class NothingPendingError extends RunBlockedError {}

export type PreparedRun = {
  batchJobId: string;
  /** The batch already had a running job: it is shown instead of starting another (one active job per batch). */
  attached: boolean;
};

// Why the Seller's plan cannot run this, or null when it can. Mirrors the backend's checks.
export const planBlocksRun = (
  entitlements: Entitlements,
  productCount: number,
  variationCount: number,
  requireApproval: boolean
): string | null => {
  if (entitlements.maxBatchSize >= 0 && productCount > entitlements.maxBatchSize) {
    return `This run has ${productCount} products, but your plan runs up to ${entitlements.maxBatchSize} at a time. Split the batch or upgrade to Pro.`;
  }
  const maxVariations = featureLimit(entitlements, "design_variations");
  if (typeof maxVariations === "number" && variationCount > maxVariations) {
    return `Your plan generates up to ${maxVariations} variation${maxVariations === 1 ? "" : "s"} per product. Lower the variants or upgrade to Pro.`;
  }
  if (!requireApproval && !hasFeature(entitlements, "auto_approval")) {
    return "Automatic design approval is part of Pro. Set Design approval to manual review, or upgrade to Pro.";
  }
  return null;
};

// Runs every check the backend would make when the job starts, before anything is created, so a
// run that cannot work fails with a clear message and leaves no stray job behind. Then returns the
// draft job to configure: an existing one, or a new one from the batch's pending products.
export const prepareRun = async (plan: RunPlan, queryClient: QueryClient): Promise<PreparedRun> => {
  const fresh = { staleTime: 0 };

  const jobs = await queryClient.fetchQuery({
    queryKey: batchJobKeys.byBatch(plan.batchId),
    queryFn: () => listBatchJobs(plan.batchId),
    ...fresh,
  });
  const active = jobs.find((job) => ACTIVE_JOB_STATUSES.includes(job.status.toLowerCase()));
  if (active) return { batchJobId: active.id, attached: true };

  // A run generates for the batch's pending products, so a draft job is reused only when it holds
  // exactly those: a draft made earlier misses the products added since, and one whose products were
  // already generated in another job would generate them all again.
  const products = await queryClient.fetchQuery({
    queryKey: batchKeys.products(plan.batchId),
    queryFn: () => listBatchProducts(plan.batchId),
    ...fresh,
  });
  const pending = products.filter((product) => product.status === "pending");
  if (pending.length === 0) {
    throw new NothingPendingError(
      "This batch has no pending products. Add products to it, or open an earlier run from the Jobs menu on the Batches page."
    );
  }
  const pendingIds = new Set(pending.map((product) => product.id));

  let reusableDraftId: string | null = null;
  for (const draft of jobs.filter((job) => job.status.toLowerCase() === "draft")) {
    const detail = await queryClient.fetchQuery({
      queryKey: batchJobKeys.detail(draft.id),
      queryFn: () => getBatchJob(draft.id),
      ...fresh,
    });
    const draftIds = new Set(detail.products.flatMap((product) => (product.productId ? [product.productId] : [])));
    if (draftIds.size === pendingIds.size && [...pendingIds].every((id) => draftIds.has(id))) {
      reusableDraftId = draft.id;
      break;
    }
  }

  const productTypes = countProductTypes(pending);
  const productCount = pending.length;

  if (plan.mockup) {
    const templates = await queryClient.fetchQuery({
      queryKey: mockupTemplateKeys.list(),
      queryFn: () => listMockupTemplates(),
      ...fresh,
    });
    if (plan.mockup.templateIds.some((id) => !templates.some((template) => template.id === id))) {
      throw new RunBlockedError("A selected mock-up template no longer exists. Choose the templates again.");
    }
    // The run makes mock-ups for the pending products only. A template still chosen for a type whose products
    // were made earlier is simply not used; the run is stopped only when nothing chosen fits what is waiting.
    const usable = narrowMockupSelection(plan.mockup, templates, productTypes);
    if (plan.mockup.templateIds.length > 0 && usable.templateIds.length === 0) {
      const waiting = Object.keys(productTypes).map(productTypeLabel).join(", ");
      throw new RunBlockedError(`None of the chosen mock-up templates is for the products waiting in this batch (${waiting}). Choose a template for them in Apply mock-up.`);
    }
    plan.mockup = usable;
  }

  const keys = await queryClient.fetchQuery({ queryKey: apiKeyKeys.all, queryFn: () => listApiKeys(), ...fresh });
  if (!keys.items.some((key) => key.provider.toLowerCase().includes("gemini") && key.status === "Connected")) {
    throw new RunBlockedError("Connect a valid Google Gemini API key on the API Keys page before running.");
  }

  // Plans differ by feature, not by monthly quota: the run must fit what the plan includes.
  const entitlements = await queryClient.fetchQuery({
    queryKey: ENTITLEMENTS_QUERY_KEY,
    queryFn: getEntitlementsRequest,
    ...fresh,
  });
  const blocked = planBlocksRun(entitlements, productCount, plan.variationCount, plan.requireApproval);
  if (blocked) throw new RunBlockedError(blocked);

  // Free and the Pro trial run within their allowances.
  const allowances = await queryClient.fetchQuery({ queryKey: ALLOWANCES_QUERY_KEY, queryFn: getAllowancesRequest, ...fresh });
  const overAllowance = allowanceBlocksRun(allowances, {
    productCount,
    variationCount: plan.variationCount,
    templateCount: plan.mockup?.templateIds.length ?? 0,
  });
  if (overAllowance) throw new RunBlockedError(overAllowance);

  if (reusableDraftId) return { batchJobId: reusableDraftId, attached: false };
  const approved = await approveBatch(plan.batchId);
  await queryClient.invalidateQueries({ queryKey: batchKeys.all });
  return { batchJobId: approved.batchJobId, attached: false };
};
