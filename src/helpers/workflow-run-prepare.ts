import { apiKeyKeys, listApiKeys } from "@/api/api-keys";
import { batchJobKeys, getBatchJob, listBatchJobs } from "@/api/batch-jobs";
import { approveBatch, batchKeys, listBatchProducts } from "@/api/batches";
import { designTemplateKeys, getDesignTemplate } from "@/api/design-templates";
import { listMockupTemplates, mockupTemplateKeys } from "@/api/mockup-templates";
import { getSubscriptionOverviewRequest } from "@/api/subscription";
import { missingDesignTextWarning, thinInputWarning } from "@/helpers/design-text";
import { countProductTypes, productTypeLabel } from "@/helpers/mockup-template";
import { ACTIVE_JOB_STATUSES, narrowMockupSelection, type RunPlan } from "@/helpers/workflow-run";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { Product } from "@/types/batches";
import type { QueryClient } from "@tanstack/react-query";

const IMAGE_QUOTA_CODE = "image_generation";

// A problem the user can fix; its message is shown as is.
export class RunBlockedError extends Error {}

// Every product of the batch already has its designs. Not a problem when the run only needs to go on to the video.
export class NothingPendingError extends RunBlockedError {}

export type PreparedRun = {
  batchJobId: string;
  /** The batch already had a running job: it is shown instead of starting another (one active job per batch). */
  attached: boolean;
  /** Things worth knowing that do not stop the run, shown as is. */
  warnings: string[];
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
  if (active) return { batchJobId: active.id, attached: true, warnings: [] };

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
  // The list names each provider for display ("Google Gemini", "Ideogram"), which contains the name the run uses.
  if (!keys.items.some((key) => key.provider.toLowerCase().includes(plan.imageProvider) && key.status === "Connected")) {
    const name = plan.imageProvider === "ideogram" ? "Ideogram" : "Google Gemini";
    throw new RunBlockedError(`Connect a valid ${name} API key on the API Keys page before running.`);
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

  const warnings = [await designTextWarning(plan, pending, queryClient), thinInputWarning(pending, plan.imageProvider)].filter(
    (warning): warning is string => warning !== null
  );

  if (reusableDraftId) return { batchJobId: reusableDraftId, attached: false, warnings };
  const approved = await approveBatch(plan.batchId);
  await queryClient.invalidateQueries({ queryKey: batchKeys.all });
  return { batchJobId: approved.batchJobId, attached: false, warnings };
};

// A lettering template prints each product's design text. A template that cannot be read here is left for the
// server to report when the job starts, so this check never stops a run on its own.
const designTextWarning = async (plan: RunPlan, pending: Product[], queryClient: QueryClient): Promise<string | null> => {
  if (!plan.designTemplateId) return null;
  try {
    const template = await queryClient.fetchQuery({
      queryKey: designTemplateKeys.detail(plan.designTemplateId),
      queryFn: () => getDesignTemplate(plan.designTemplateId),
    });
    return missingDesignTextWarning(template.basePrompt, pending);
  } catch {
    return null;
  }
};
