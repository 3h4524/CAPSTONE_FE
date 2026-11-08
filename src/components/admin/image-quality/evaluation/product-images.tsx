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
        <span className="text-base font-semibold text-ink-900">{lane.product}</span>
        {lane.expectedText ? (
          <span className="text-[13px] text-ink-500">
            phrase <span className="font-medium text-ink-700">“{lane.expectedText}”</span>
          </span>
        ) : (
          <span className="text-[13px] text-ink-500">No lettering</span>
        )}
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-normal text-ink-600">
          {lane.before.length} before · {lane.after.length} after
        </span>
      </span>
    </AccordionTrigger>
    <AccordionContent className="grid gap-4 pb-5 lg:grid-cols-2">
      <ImageLane title="Before" images={lane.before} versionLabels={versionLabels} />
      <ImageLane title="After" images={lane.after} versionLabels={versionLabels} isAfter />
    </AccordionContent>
  </AccordionItem>
);
