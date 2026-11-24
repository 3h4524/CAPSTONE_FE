"use client";

import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PromoVideo } from "@/types/video-workflow";

type VideoCinemaModalProps = {
  video?: Partial<PromoVideo> | null;
  videoUrl?: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const VideoCinemaModal = ({
  video,
  videoUrl,
  title,
  open,
  onOpenChange,
}: VideoCinemaModalProps) => {
  const { t } = useTranslation("common");
  const effectiveUrl = video?.previewUrl ?? videoUrl;

  if (!effectiveUrl) return null;

  const handleDownload = () => {
    const anchor = document.createElement("a");
    anchor.href = effectiveUrl;
    anchor.download = `video-${video?.version ?? "preview"}.mp4`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-3xl flex-col gap-3 p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <div>
            <DialogTitle className="text-base font-semibold">
              {title ?? t("workflowEditor.runView.previewVideo")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              {video?.version ? `Version ${video.version} • ` : ""}
              {video?.width && video?.height ? `${video.width}×${video.height}px` : "1080p"}
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

        <div className="relative flex max-h-[70vh] min-h-[360px] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          <video
            src={effectiveUrl}
            poster={video?.thumbnailUrl ?? undefined}
            controls
            autoPlay
            playsInline
            className="max-h-[68vh] w-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
