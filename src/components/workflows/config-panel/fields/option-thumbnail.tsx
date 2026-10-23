import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { cn } from "@/utils/cn";

type OptionThumbnailProps = {
  imageUrl: string | null | undefined;
  className?: string;
};

// The small picture before a choice in a dropdown or a preview, or a placeholder when it has none.
export const OptionThumbnail = ({ imageUrl, className }: OptionThumbnailProps) =>
  imageUrl ? (
    <Image src={imageUrl} alt="" width={72} height={72} unoptimized className={cn("bg-muted shrink-0 rounded-md object-cover", className)} />
  ) : (
    <span className={cn("bg-muted flex shrink-0 items-center justify-center rounded-md text-slate-400", className)} aria-hidden="true">
      <ImageIcon className="size-3.5" />
    </span>
  );
