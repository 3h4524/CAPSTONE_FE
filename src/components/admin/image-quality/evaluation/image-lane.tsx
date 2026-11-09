import { ImageCard } from "@/components/admin/image-quality/evaluation/image-card";
import { HorizontalStrip } from "@/components/commons/data-display/horizontal-strip";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ImageEvalImage } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type ImageLaneProps = {
  title: string;
  images: ImageEvalImage[];
  versionLabels: ReadonlyMap<string, string>;
  isAfter?: boolean;
};

export const ImageLane = ({ title, images, versionLabels, isAfter = false }: ImageLaneProps) => {
  const isPhone = useIsPhone();
  const cards = images.map((image) => (
    <ImageCard
      key={image.id}
      image={image}
      versionLabel={versionLabels.get(image.version) ?? image.version}
      isAfter={isAfter}
    />
  ));

  return (
  <div
    className={cn(
      "flex min-w-0 flex-col gap-3 rounded-lg p-4 max-md:p-3",
      isAfter ? "bg-sky-50/70 dark:bg-sky-500/10 ring-1 ring-sky-100 dark:ring-sky-500/30" : "bg-ink-50 ring-1 ring-ink-100"
    )}
  >
    <h4
      className={cn(
        "flex items-baseline gap-2 text-sm font-semibold",
        isAfter ? "text-sky-900 dark:text-sky-300" : "text-ink-700"
      )}
    >
      {title}
      <span className="text-xs font-normal text-ink-500">
        {images.length} {images.length === 1 ? "image" : "images"}
      </span>
    </h4>
    {images.length === 0 ? (
      <p className="text-[13px] text-ink-500">No image on this side.</p>
    ) : isPhone ? (
      // Side by side the images compare at a glance; stacked, one would fill the screen.
      <HorizontalStrip itemsLabel={`${title.toLowerCase()} images`} itemCount={images.length} className="gap-3">
        {cards}
      </HorizontalStrip>
    ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">{cards}</div>
    )}
  </div>
  );
};
