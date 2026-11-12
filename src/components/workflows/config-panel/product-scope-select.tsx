"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import {
  productScopeKey,
  readProductConfigs,
  sameConfig,
  withoutProductConfigs,
} from "@/helpers/product-video-configs";
import { readString } from "@/helpers/workflow-config";
import { supportsBatchVideos } from "@/helpers/workflow-run";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { sharedGraphNodes, useWorkflowStore } from "@/stores/workflow";

const FIELD_ID = "video-product-scope";

/**
 * At the top of Generate Video before a batch video run: whose video settings the panel shows. "All products" is the
 * workflow's shared settings; a product of the batch shows its own, every field of the node included, and Save keeps
 * them for that product only (in the workflow, see `useWorkflowSave`). Each design of the product then renders with
 * them. Its images are matched to each design's mock-ups once they exist, as the shared settings are.
 */
export const ProductScopeSelect = ({ nodeId }: { nodeId: string }) => {
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId)
  );
  const batchVideos = useWorkflowStore((state) => supportsBatchVideos(sharedGraphNodes(state)));
  const scope = useWorkflowStore((state) => (state.designScope?.kind === "product" ? state.designScope : null));
  const otherScope = useWorkflowStore((state) => state.designScope?.kind === "design");
  const nodeConfig = useWorkflowStore((state) => state.nodes.find((node) => node.id === nodeId)?.data.config);
  const enter = useWorkflowStore((state) => state.enterDesignScope);
  const leave = useWorkflowStore((state) => state.leaveDesignScope);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const { data: products } = useBatchProducts(batchId);

  if (otherScope || !batchId || !batchVideos || !products || products.length < 2) return null;

  const shared = scope ? scope.sharedConfig : (nodeConfig ?? {});
  const own = readProductConfigs(shared);
  const sharedView = withoutProductConfigs(shared);
  const unsaved = Boolean(scope && nodeConfig && !sameConfig(nodeConfig, scope.baseConfig));
  const hasOwn = Boolean(scope && own[scope.productId]);
  const followsShared = Boolean(scope && nodeConfig && sameConfig(nodeConfig, sharedView));

  const choose = (value: string) => {
    const productId = value ? value.replace(/^product:/, "") : "";
    if (productId === (scope?.productId ?? "")) return;
    if (unsaved && scope && !window.confirm(`Discard the unsaved changes to ${scope.label}?`)) return;
    if (!productId) {
      leave();
      return;
    }
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    enter(
      { kind: "product", key: productScopeKey(product.id), productId: product.id, artworkGroupKey: "", label: product.name, runId: null },
      own[product.id] ?? sharedView
    );
  };

  const options = products.map((product) => ({
    value: productScopeKey(product.id),
    label: product.name,
    hint: own[product.id] ? "Own settings" : "Shared settings",
  }));

  return (
    <section className="bg-ink-50/70 space-y-2.5 rounded-lg border p-3" aria-label="Which product's video settings">
      <Label htmlFor={FIELD_ID}>Video product</Label>
      <OptionSelect
        standaloneId={FIELD_ID}
        value={scope?.key ?? ""}
        options={options}
        placeholder="All products"
        noneLabel="All products (shared settings)"
        onChange={choose}
      />
      {!scope ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {Object.keys(own).length > 0
            ? `${Object.keys(own).length} of ${products.length} products have their own settings; the others use these.`
            : "Every product uses these settings. Choose a product to give its video settings of its own."}
        </p>
      ) : (
        <>
          <PanelNotice tone={unsaved ? "warning" : "info"}>
            {unsaved
              ? hasOwn && followsShared
                ? `Save to put ${scope.label} back on the shared settings.`
                : `Unsaved changes to ${scope.label}. Save keeps them for this product only; the shared settings stay as they are.`
              : hasOwn
                ? `${scope.label} has its own settings. Everything below applies to this product only.`
                : `${scope.label} follows the shared settings. Change anything below and Save keeps it for this product only.`}
          </PanelNotice>
          {!followsShared && (hasOwn || unsaved) && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 hover:translate-y-0"
              onClick={() => updateNodeConfig(nodeId, sharedView)}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Use shared settings
            </Button>
          )}
        </>
      )}
    </section>
  );
};
