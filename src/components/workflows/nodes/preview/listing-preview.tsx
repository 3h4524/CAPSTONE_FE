"use client";

import { useTranslation } from "react-i18next";

import { getListingContent } from "@/api/listing-content";
import { Badge } from "@/components/ui/badge";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { StreamingText } from "@/components/workflows/nodes/preview/streaming-text";
import { LISTING_TAG_COUNT } from "@/constants/listing-stream";
import { toListingPreview } from "@/helpers/listing-stream";
import { readString } from "@/helpers/workflow-config";
import { useQuery } from "@/hooks/queries/use-query";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useListingStreamStore } from "@/stores/listing-stream";
import { useWorkflowStore } from "@/stores/workflow";
import type { ListingContentResult } from "@/types/listing-content";

/**
 * Beside Listing content: the listing as Gemini writes it, live; otherwise (a page opened after it was written, or
 * reloaded) the product's saved listing, the newest one, as the step's panel shows it. Nothing while there is none.
 */
export const ListingPreview = () => {
  const order = useListingStreamStore((state) => state.order);
  const streamedId = order.at(-1);
  const product = useListingStreamStore((state) => (streamedId ? state.products[streamedId] : undefined));

  // Not streamed in this page: the listing saved for the open run's product, or the one Product input names.
  const { run } = useWorkflowRuntime();
  const inputProductId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId)
  );
  const savedProductId = product ? "" : run?.productId || inputProductId;
  // The same query as the step's panel, so both show the same listing and it is fetched once.
  const { data: saved } = useQuery<ListingContentResult>({
    queryKey: ["listing-content", savedProductId],
    queryFn: () => getListingContent(savedProductId),
    enabled: Boolean(savedProductId),
    // A product without a listing yet answers 404, which is not a problem to report.
    suppressErrorToast: true,
  });
  const step = run?.nodes.find((node) => node.nodeType === "generate-listing");
  const fromRun = step?.output as Partial<ListingContentResult> | undefined;
  const stored =
    saved ?? (fromRun?.title && run?.productId === savedProductId ? (fromRun as ListingContentResult) : undefined);

  if (product) {
    const listing = toListingPreview(product);
    const streaming = product.status === "streaming";
    return (
      <ListingCard
        tone={streaming ? "live" : product.status === "failed" ? "failed" : "done"}
        productCount={order.length}
        failure={product.status === "failed" ? (product.message ?? undefined) : undefined}
        title={listing.title}
        tags={listing.tags}
        description={listing.description}
        typingTitle={streaming && !listing.titleDone}
        typingDescription={streaming && listing.titleDone && !listing.descriptionDone}
      />
    );
  }
  if (!stored?.title) return null;
  return (
    <ListingCard
      tone="done"
      title={stored.title}
      tags={(stored.tags ?? []).map((tag) => tag.value).slice(0, LISTING_TAG_COUNT)}
      description={stored.description ?? ""}
    />
  );
};

type ListingCardProps = {
  tone: "live" | "failed" | "done";
  /** How many products have been written in this page; shown from the second one. */
  productCount?: number;
  failure?: string;
  title: string;
  tags: string[];
  description: string;
  typingTitle?: boolean;
  typingDescription?: boolean;
};

const ListingCard = ({
  tone,
  productCount = 1,
  failure,
  title,
  tags,
  description,
  typingTitle = false,
  typingDescription = false,
}: ListingCardProps) => {
  const { t } = useTranslation("common");
  const statusLabel =
    tone === "live"
      ? t("workflowEditor.runView.previewWriting")
      : tone === "failed"
        ? t("workflowEditor.runView.previewFailed")
        : t("workflowEditor.runView.previewDone");

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewListing")}
        {productCount > 1 && (
          <span className="text-wf-faint normal-case tabular-nums">
            {t("workflowEditor.runView.previewProduct", { current: productCount })}
          </span>
        )}
        <PreviewStatus tone={tone} label={statusLabel} />
      </div>
      {failure && <p className="text-wf-fail text-[11px] leading-snug">{failure}</p>}
      <div className="grid gap-0.5">
        <span className="text-wf-faint text-[9px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewTitle")}
        </span>
        <StreamingText
          text={title}
          typing={typingTitle}
          className="text-wf-ink text-[11.5px] leading-snug font-semibold"
        />
      </div>
      <div className="grid gap-1">
        <span className="text-wf-faint text-[9px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewTags")}{" "}
          <span className="tabular-nums">
            {tags.length}/{LISTING_TAG_COUNT}
          </span>
        </span>
        <div className="flex min-h-4 flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="border-wf-cat-ai-line bg-wf-cat-ai-soft text-wf-cat-ai animate-in fade-in zoom-in-75 h-4 rounded-full px-1.5 text-[9.5px] font-medium"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-0.5">
        <span className="text-wf-faint text-[9px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewDescription")}
        </span>
        <StreamingText
          text={description}
          typing={typingDescription}
          className="text-wf-dim line-clamp-5 text-[11px] leading-snug"
        />
      </div>
    </div>
  );
};
