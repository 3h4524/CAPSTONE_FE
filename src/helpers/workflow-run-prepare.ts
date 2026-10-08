import { apiKeyKeys, listApiKeys } from "@/api/api-keys";
import { batchJobKeys, getBatchJob, listBatchJobs } from "@/api/batch-jobs";
import { approveBatch, batchKeys, listBatchProducts } from "@/api/batches";
import { listMockupTemplates, mockupTemplateKeys } from "@/api/mockup-templates";
import { getSubscriptionOverviewRequest } from "@/api/subscription";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { ACTIVE_JOB_STATUSES, type RunPlan } from "@/helpers/workflow-run";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { QueryClient } from "@tanstack/react-query";

const IMAGE_QUOTA_CODE = "image_generation";

// A problem the user can fix; its message is shown as is.
export class RunBlockedError extends Error {}

export type PreparedRun = {
  batchJobId: string;
  /** The batch already had a running job: it is shown instead of starting another (one active job per batch). */
  attached: boolean;
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
    throw new RunBlockedError(
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
    plan.mockup.templateIds.forEach((id) => {
      const template = templates.find((item) => item.id === id);
      if (!template) throw new RunBlockedError("A selected mock-up template no longer exists. Choose the templates again.");
      if (!(template.productType.toLowerCase() in productTypes)) {
        throw new RunBlockedError(
          `${template.name} is a ${productTypeLabel(template.productType)} template, but this batch has no ${productTypeLabel(template.productType)} products.`
        );
      }
    });
  }

  const keys = await queryClient.fetchQuery({ queryKey: apiKeyKeys.all, queryFn: () => listApiKeys(), ...fresh });
  if (!keys.items.some((key) => key.provider.toLowerCase().includes("gemini") && key.status === "Connected")) {
    throw new RunBlockedError("Connect a valid Google Gemini API key on the API Keys page before running.");
  }

  const overview = await queryClient.fetchQuery({
    queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY,
    queryFn: getSubscriptionOverviewRequest,
    ...fresh,
  });
  const quota = overview.usageQuotas.find((item) => item.quotaCode === IMAGE_QUOTA_CODE);
  const imagesNeeded = productCount * plan.variationCount;
  if (quota && imagesNeeded > Math.max(0, quota.limit - quota.used)) {
    throw new RunBlockedError(
      `This run needs ${imagesNeeded} images but your plan has ${Math.max(0, quota.limit - quota.used)} left. Lower the variants or upgrade your plan.`
    );
  }

  if (reusableDraftId) return { batchJobId: reusableDraftId, attached: false };
  const approved = await approveBatch(plan.batchId);
  await queryClient.invalidateQueries({ queryKey: batchKeys.all });
  return { batchJobId: approved.batchJobId, attached: false };
};
