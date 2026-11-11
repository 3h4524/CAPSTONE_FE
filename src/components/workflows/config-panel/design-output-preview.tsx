"use client";

import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { parseAspectRatio, readString } from "@/helpers/workflow-config";
import { ratioTileSize } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeConfig } from "@/types/workflow";

const TILE_SIDE = 56;

// The design one product gets, drawn at the chosen ratio, and how many images the whole run makes. A product gets
// one design; more are made with Regenerate on the product.
export const DesignOutputPreview = ({ config }: { config: WorkflowNodeConfig }) => {
  const batchId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId));
  const { data: products } = useBatchProducts(batchId);
  const ratio = readString(config.aspectRatio) || "1:1";
  const tile = ratioTileSize(parseAspectRatio(ratio), TILE_SIDE);
  const pending = products?.filter((product) => product.status === "pending").length;

  return (
    <PanelSection title="Preview">
      <div className="flex min-h-22 flex-wrap items-center justify-center gap-2 rounded-md border bg-slate-50/60 px-3 py-4" aria-hidden="true">
        <span
          className="text-muted-foreground flex items-center justify-center rounded-sm border border-slate-300 bg-white text-xs tabular-nums"
          style={{ width: tile.width, height: tile.height }}
        >
          1
        </span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        1 design per product at {ratio}
        {pending !== undefined && `, about ${pending} image${pending === 1 ? "" : "s"} for ${pending} pending product${pending === 1 ? "" : "s"}`}.
        {" "}To get more designs for a product, use Regenerate on it after the run.
      </p>
    </PanelSection>
  );
};
