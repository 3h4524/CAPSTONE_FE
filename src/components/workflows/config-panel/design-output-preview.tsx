"use client";

import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { parseAspectRatio, readNumber, readString } from "@/helpers/workflow-config";
import { ratioTileSize } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeConfig } from "@/types/workflow";

const TILE_SIDE = 56;

// The designs one product gets, drawn at the chosen ratio, and how many images the whole run makes.
export const DesignOutputPreview = ({ config }: { config: WorkflowNodeConfig }) => {
  const batchId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId));
  const { data: products } = useBatchProducts(batchId);
  const variants = readNumber(config.variants) ?? 0;
  const ratio = readString(config.aspectRatio) || "1:1";
  const tile = ratioTileSize(parseAspectRatio(ratio), TILE_SIDE);
  const pending = products?.filter((product) => product.status === "pending").length;

  return (
    <PanelSection title="Preview">
      <div className="flex min-h-22 flex-wrap items-center justify-center gap-2 rounded-md border bg-slate-50/60 px-3 py-4" aria-hidden="true">
        {Array.from({ length: variants }, (_, index) => (
          <span
            key={index}
            className="text-muted-foreground flex items-center justify-center rounded-sm border border-slate-300 bg-white text-xs tabular-nums"
            style={{ width: tile.width, height: tile.height }}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {variants} design{variants === 1 ? "" : "s"} per product at {ratio}
        {pending !== undefined && `, about ${variants * pending} image${variants * pending === 1 ? "" : "s"} for ${pending} pending product${pending === 1 ? "" : "s"}`}.
      </p>
    </PanelSection>
  );
};
