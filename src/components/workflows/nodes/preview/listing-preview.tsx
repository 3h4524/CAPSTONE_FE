"use client";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { StreamingText } from "@/components/workflows/nodes/preview/streaming-text";
import { LISTING_TAG_COUNT } from "@/constants/listing-stream";
import { toListingPreview } from "@/helpers/listing-stream";
import { useListingStreamStore } from "@/stores/listing-stream";

export const ListingPreview = () => {
  const { t } = useTranslation("common");
  const order = useListingStreamStore((state) => state.order);
  const productId = order.at(-1);
  const product = useListingStreamStore((state) => (productId ? state.products[productId] : undefined));
  if (!product) return null;

  const listing = toListingPreview(product);
  const streaming = product.status === "streaming";
  const tone = streaming ? "live" : product.status === "failed" ? "failed" : "done";
  const statusLabel = streaming
    ? t("workflowEditor.runView.previewWriting")
    : product.status === "failed"
      ? t("workflowEditor.runView.previewFailed")
      : t("workflowEditor.runView.previewDone");

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {t("workflowEditor.runView.previewListing")}
        {order.length > 1 && (
          <span className="text-wf-faint normal-case tabular-nums">
            {t("workflowEditor.runView.previewProduct", { current: order.length })}
          </span>
        )}
        <PreviewStatus tone={tone} label={statusLabel} />
      </div>
      {product.status === "failed" && product.message && (
        <p className="text-wf-fail text-[11px] leading-snug">{product.message}</p>
      )}
      <div className="grid gap-0.5">
        <span className="text-wf-faint text-[9px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewTitle")}
        </span>
        <StreamingText
          text={listing.title}
          typing={streaming && !listing.titleDone}
          className="text-wf-ink text-[11.5px] leading-snug font-semibold"
        />
      </div>
      <div className="grid gap-1">
        <span className="text-wf-faint text-[9px] font-semibold tracking-wider uppercase">
          {t("workflowEditor.runView.previewTags")}{" "}
          <span className="tabular-nums">
            {listing.tags.length}/{LISTING_TAG_COUNT}
          </span>
        </span>
        <div className="flex min-h-4 flex-wrap gap-1">
          {listing.tags.map((tag) => (
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
          text={listing.description}
          typing={streaming && listing.titleDone && !listing.descriptionDone}
          className="text-wf-dim line-clamp-5 text-[11px] leading-snug"
        />
      </div>
    </div>
  );
};
