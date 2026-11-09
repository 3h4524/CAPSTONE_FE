import { ImageLane } from "@/components/admin/image-quality/evaluation/image-lane";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ImageEvalProductLanes } from "@/types/admin-image-quality";

type ProductImagesProps = {
  lane: ImageEvalProductLanes;
  versionLabels: ReadonlyMap<string, string>;
};

export const ProductImages = ({ lane, versionLabels }: ProductImagesProps) => (
  <AccordionItem value={lane.product}>
    <AccordionTrigger className="py-4 hover:no-underline">
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-ink-900 text-base font-semibold">{lane.product}</span>
        {lane.expectedText ? (
          <span className="text-ink-500 text-[13px]">
            phrase <span className="text-ink-700 font-medium">“{lane.expectedText}”</span>
          </span>
        ) : (
          <span className="text-ink-500 text-[13px]">No lettering</span>
        )}
        <span className="bg-ink-100 text-ink-600 rounded-full px-2 py-0.5 text-xs font-normal">
          {lane.before.length} before · {lane.after.length} after
        </span>
      </span>
    </AccordionTrigger>
    <AccordionContent className="grid gap-4 pb-5 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 max-md:pb-4 lg:grid-cols-2">
      <ImageLane title="Before" images={lane.before} versionLabels={versionLabels} />
      <ImageLane title="After" images={lane.after} versionLabels={versionLabels} isAfter />
    </AccordionContent>
  </AccordionItem>
);
