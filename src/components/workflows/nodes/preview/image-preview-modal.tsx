"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

export type PreviewImageItem = {
  url: string;
  label?: string;
  subLabel?: string;
};

type ImagePreviewModalProps = {
  images: (string | PreviewImageItem)[];
  initialIndex?: number;
  open: boolean;
  title?: string;
  onOpenChange: (open: boolean) => void;
};

export const ImagePreviewModal = ({
  images,
  initialIndex = 0,
  open,
  title,
  onOpenChange,
}: ImagePreviewModalProps) => {
  const { t } = useTranslation("common");
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  }, [open, initialIndex, images.length]);

  const items: PreviewImageItem[] = images.map((item, i) =>
    typeof item === "string" ? { url: item, label: `#${i + 1}` } : item
  );

  const current = items[index];

  useEffect(() => {
    if (!open || items.length <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (event.key === "ArrowRight") {
        setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items.length]);

  if (!current) return null;

  const handleDownload = () => {
    const anchor = document.createElement("a");
    anchor.href = current.url;
    anchor.download = `preview-${index + 1}.png`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-4xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <div>
            <DialogTitle className="text-base font-semibold">
              {title ?? t("workflowEditor.runView.previewDesigns")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {current.label ? `${current.label} • ` : ""}
              {t("workflowMedia.runStatus.hudStep", {
                current: index + 1,
                total: items.length,
                defaultValue: `${index + 1} / ${items.length}`,
              })}
              {current.subLabel ? ` • ${current.subLabel}` : ""}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 gap-1.5 px-2 text-xs"
          >
            <Download className="size-3.5" />
            <span>{t("common.download", "Download")}</span>
          </Button>
        </DialogHeader>

        <div className="relative flex max-h-[65vh] min-h-[300px] w-full items-center justify-center overflow-hidden rounded-lg bg-black/5 dark:bg-black/40">
          <div className="relative aspect-square max-h-[60vh] w-full">
            <Image
              src={current.url}
              alt={current.label ?? ""}
              fill
              unoptimized
              className="animate-in fade-in zoom-in-95 object-contain duration-200"
            />
          </div>

          {items.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Previous image"
                onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))}
                className="bg-background/80 hover:bg-background absolute left-2 size-8 rounded-full shadow-md backdrop-blur-xs"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Next image"
                onClick={() => setIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))}
                className="bg-background/80 hover:bg-background absolute right-2 size-8 rounded-full shadow-md backdrop-blur-xs"
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "relative size-12 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  i === index
                    ? "border-primary scale-105 shadow-sm"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="48px"
                  unoptimized
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
