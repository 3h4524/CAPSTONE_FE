"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ImagePreviewModal,
  type PreviewImageItem,
} from "@/components/workflows/nodes/preview/image-preview-modal";
import { PreviewStatus } from "@/components/workflows/nodes/preview/preview-status";
import { previewToneOf } from "@/helpers/workflow-run-view";
import type { WorkflowNodeStatus } from "@/types/workflow";

const PAGE_SIZE = 4;
const INITIAL_SKELETONS = 2;

type ImageGridPreviewProps = {
  label: string;
  images: (string | PreviewImageItem)[];
  status: WorkflowNodeStatus;
};

export const ImageGridPreview = ({ label, images, status }: ImageGridPreviewProps) => {
  const { t } = useTranslation("common");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const shown = images.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const isRunning = status === "running";

  if (images.length === 0 && !isRunning) return null;

  const tone = previewToneOf(status);
  const placeholderCount =
    images.length === 0 && isRunning
      ? INITIAL_SKELETONS
      : isRunning && safePage === totalPages - 1 && shown.length % 2 !== 0
        ? 1
        : 0;

  return (
    <div className="grid gap-2">
      <div className="text-wf-dim flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase">
        <div className="flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-wf-faint tabular-nums">{images.length}</span>
          <PreviewStatus
            tone={tone}
            label={
              tone === "live"
                ? t("workflowEditor.runView.previewLive")
                : tone === "failed"
                  ? t("workflowEditor.runView.previewFailed")
                  : t("workflowEditor.runView.previewDone")
            }
          />
        </div>

        {totalPages > 1 && (
          <div className="text-wf-faint flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={(e) => {
                e.stopPropagation();
                setPage((prev) => Math.max(0, prev - 1));
              }}
              className="hover:text-wf-ink rounded p-0.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="px-0.5 tabular-nums">
              {safePage + 1}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={(e) => {
                e.stopPropagation();
                setPage((prev) => Math.min(totalPages - 1, prev + 1));
              }}
              className="hover:text-wf-ink rounded p-0.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="size-3" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {shown.map((item, indexInPage) => {
          const globalIndex = safePage * PAGE_SIZE + indexInPage;
          const url = typeof item === "string" ? item : item.url;
          const itemLabel = typeof item === "string" ? undefined : item.label;

          return (
            <button
              key={`${globalIndex}:${url}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(globalIndex);
                setModalOpen(true);
              }}
              className="group/tile border-wf-line animate-in fade-in zoom-in-95 hover:border-wf-accent relative aspect-square overflow-hidden rounded-md border duration-300 focus-visible:outline-hidden"
            >
              <Image
                src={url}
                alt={itemLabel ?? ""}
                fill
                sizes="120px"
                unoptimized
                className="object-cover transition-transform duration-300 group-hover/tile:scale-105"
              />
              <span className="absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100">
                <Maximize2 className="size-3.5 drop-shadow-sm" />
              </span>
              {itemLabel && (
                <span className="absolute bottom-1 left-1 line-clamp-1 max-w-[calc(100%-8px)] rounded bg-black/60 px-1 py-0.5 text-[8px] leading-none font-medium text-white">
                  {itemLabel}
                </span>
              )}
            </button>
          );
        })}

        {Array.from({ length: placeholderCount }, (_, index) => (
          <Skeleton key={index} className="bg-wf-line/70 aspect-square rounded-md" />
        ))}
      </div>

      <ImagePreviewModal
        images={images}
        initialIndex={selectedIndex}
        open={modalOpen}
        title={label}
        onOpenChange={setModalOpen}
      />
    </div>
  );
};
