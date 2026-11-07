import { ImageCard } from "@/components/admin/image-quality/evaluation/image-card";
import type { ImageEvalImage } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type ImageLaneProps = {
  title: string;
  images: ImageEvalImage[];
  versionLabels: ReadonlyMap<string, string>;
  isAfter?: boolean;
};

export const ImageLane = ({ title, images, versionLabels, isAfter = false }: ImageLaneProps) => (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-3 rounded-lg p-4",
      isAfter ? "bg-sky-50/70 ring-1 ring-sky-100" : "bg-slate-50 ring-1 ring-slate-100"
    )}
  >
    <h4
      className={cn(
        "flex items-baseline gap-2 text-sm font-semibold",
        isAfter ? "text-sky-900" : "text-slate-700"
      )}
    >
      {title}
      <span className="text-xs font-normal text-slate-500">
        {images.length} {images.length === 1 ? "image" : "images"}
      </span>
    </h4>
    {images.length === 0 ? (
      <p className="text-[13px] text-slate-500">No image on this side.</p>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            versionLabel={versionLabels.get(image.version) ?? image.version}
            isAfter={isAfter}
          />
        ))}
      </div>
    )}
  </div>
);
