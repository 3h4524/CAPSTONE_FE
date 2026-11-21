import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Plus, RotateCw, Sparkles } from "lucide-react";

import { cn } from "@/utils/cn";

// A square photo of what each video template shows: no template has a preview of its own yet (previewVideoUrl is null).
// Product on Model shows a model from the AI character catalog wearing a T-shirt; Rotating Showcase shows a real
// T-shirt, as its camera moves over the seller's product photos.
const PREVIEWS: Record<string, { src: string; badge: LucideIcon }> = {
  product_on_model_pack: { src: "/images/video-templates/product-on-model.webp", badge: Sparkles },
  standard_rotate_showcase: { src: "/images/video-templates/rotating-showcase.webp", badge: RotateCw },
};

type VideoTemplateThumbnailProps = {
  code: string;
  ai: boolean;
  selected?: boolean;
  className?: string;
};

export const VideoTemplateThumbnail = ({ code, ai, selected = false, className }: VideoTemplateThumbnailProps) => {
  const frame = cn(
    "relative block size-16 shrink-0 overflow-hidden rounded-lg border transition-[border-color,box-shadow]",
    selected ? "border-primary/50 ring-primary/15 ring-2" : "border-ink-200",
    className
  );

  // Start from scratch: no scenes yet, so an empty frame to fill.
  if (code === "custom") {
    return (
      <span aria-hidden="true" className={cn(frame, "bg-ink-50 grid place-items-center border-dashed")}>
        <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full">
          <Plus className="size-4" strokeWidth={2.5} />
        </span>
      </span>
    );
  }

  // A template without a photo of its own shows the kind it is: a model for an AI template, a product photo otherwise.
  const preview = PREVIEWS[code] ?? PREVIEWS[ai ? "product_on_model_pack" : "standard_rotate_showcase"]!;
  const Badge = ai ? Sparkles : preview.badge;
  return (
    <span aria-hidden="true" className={cn(frame, "bg-ink-100")}>
      <Image src={preview.src} alt="" fill sizes="64px" className="object-cover" />
      <span className="bg-card/90 text-ink-800 absolute right-1 bottom-1 grid size-5 place-items-center rounded-full shadow-sm">
        <Badge className="size-3" strokeWidth={2.25} />
      </span>
    </span>
  );
};
