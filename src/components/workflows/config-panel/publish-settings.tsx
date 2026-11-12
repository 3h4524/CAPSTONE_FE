"use client";

import Link from "next/link";
import { KeyRound, Loader2, Store } from "lucide-react";

import { getPrintifyCatalog, getPrintifyConnection, getPrintifyDraft, getPrintifyProviders } from "@/api/printify";
import { getEtsyDraft } from "@/api/shop";
import { TaxonomyPicker } from "@/components/shop/etsy-publish-dialog";
import { BlueprintPicker, ChipGroup } from "@/components/shop/printify-publish-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import { useQuery } from "@tanstack/react-query";

const selectClass = "h-9 w-full rounded-md border border-ink-200 bg-card px-2 text-sm text-ink-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-60";

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown) => (typeof value === "string" && value ? value : null);
const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** The product the workflow runs for, from Product Input. */
const useWorkflowProductId = () =>
  useWorkflowStore((state) => {
    const input = state.nodes.find((node) => node.data.type === "product-input");
    return typeof input?.data.config.productId === "string" ? input.data.config.productId : "";
  });

const useConfig = (node: WorkflowNode) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const config = node.data.config;
  const patch = (next: WorkflowNodeConfig) => {
    // Read the latest config so two quick changes do not overwrite each other.
    const current = useWorkflowStore.getState().nodes.find((item) => item.id === node.id)?.data.config ?? config;
    updateNodeConfig(node.id, { ...current, ...next });
  };
  return { config, patch };
};

function Toggle({ id, label, description, checked, disabled, onChange }: { id: string; label: string; description: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Push to Printify: what Printify makes (product type, provider, colors, sizes), which approved design it prints,
 * and the profit each sale should leave. Prices are set per size from Printify's cost when the step runs.
 */
export function PrintifyPublishSettings({ node, disabled }: { node: WorkflowNode; disabled: boolean }) {
  const { config, patch } = useConfig(node);
  const productId = useWorkflowProductId();
  const blueprintId = num(config.blueprintId);
  const providerId = num(config.printProviderId);
  const colors = strings(config.colors);
  const sizes = strings(config.sizes);
  const profit = num(config.targetProfit) ?? 10;

  const connection = useQuery({ queryKey: ["printify-connection-node"], queryFn: () => getPrintifyConnection(), staleTime: 60_000 });
  const ready = connection.data?.status === "connected";
  const draft = useQuery({ queryKey: ["printify-draft", productId], queryFn: () => getPrintifyDraft(productId), enabled: ready && Boolean(productId), staleTime: 60_000 });
  const providers = useQuery({ queryKey: ["printify-providers", blueprintId], queryFn: () => getPrintifyProviders(blueprintId!), enabled: ready && Boolean(blueprintId), staleTime: 60 * 60_000 });
  const catalog = useQuery({ queryKey: ["printify-catalog", blueprintId, providerId], queryFn: () => getPrintifyCatalog(blueprintId!, providerId!), enabled: ready && Boolean(blueprintId && providerId), staleTime: 60 * 60_000 });
  const variantCount = (catalog.data?.variants ?? []).filter((variant) => (!variant.color || colors.includes(variant.color)) && (!variant.size || sizes.includes(variant.size))).length;

  const toggle = (key: "colors" | "sizes", list: string[], value: string) =>
    patch({ [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] });

  if (connection.isPending) return <p className="text-muted-foreground flex items-center gap-2 px-5 py-5 text-xs"><Loader2 className="size-3.5 animate-spin" />Checking Printify…</p>;
  if (!ready)
    return (
      <div className="px-5 py-5">
        <PanelNotice tone="warning" action={<Button asChild size="sm" variant="outline"><Link href="/api-keys"><KeyRound className="size-3.5" />Open API Keys</Link></Button>}>
          {connection.data?.status === "no_store"
            ? "Your Printify account has no store. Add one linked to your Etsy shop on Printify."
            : "Add a working Printify API key on the API Keys page to choose what Printify makes."}
        </PanelNotice>
      </div>
    );

  return (
    <>
      <PanelSection title="What Printify makes" description={`Printify store ${connection.data?.shopTitle ?? ""} publishes the product to your Etsy shop and prints each order.`}>
        <fieldset disabled={disabled} className="space-y-4">
          <BlueprintPicker
            value={blueprintId ? { id: blueprintId, title: str(config.blueprintTitle) ?? `Product ${blueprintId}` } : null}
            onChange={(next) => patch({ blueprintId: next.id, blueprintTitle: next.title, printProviderId: null, printProviderTitle: null, colors: [], sizes: [] })}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${node.id}-provider`}>Print provider</Label>
            <select id={`${node.id}-provider`} className={selectClass} value={providerId ?? ""} disabled={!providers.data?.length}
              onChange={(event) => {
                const chosen = providers.data?.find((item) => item.id === Number(event.target.value));
                patch({ printProviderId: chosen?.id ?? null, printProviderTitle: chosen?.title ?? null, colors: [], sizes: [] });
              }}>
              <option value="">{providers.isFetching ? "Loading providers…" : blueprintId ? "Choose a provider" : "Choose a product type first"}</option>
              {providers.data?.map((item) => <option key={item.id} value={item.id}>{item.title}{item.country ? ` — ${item.country}` : ""}</option>)}
            </select>
            <p className="text-muted-foreground text-xs">Providers in the United States are listed first: they reach US buyers fastest.</p>
          </div>
          {catalog.isFetching && <p className="text-muted-foreground text-xs">Loading colors and sizes…</p>}
          {catalog.data && (
            <>
              <ChipGroup label="Colors" options={catalog.data.colors} selected={colors} onToggle={(value) => toggle("colors", colors, value)} />
              <ChipGroup label="Sizes" options={catalog.data.sizes} selected={sizes} onToggle={(value) => toggle("sizes", sizes, value)} />
              <p className="text-muted-foreground text-xs">
                {variantCount} variant(s){variantCount > 100 ? " — Etsy allows 100, choose fewer." : ""}
                {catalog.data.usShippingFirstItem != null && ` · US shipping charged to the buyer: $${catalog.data.usShippingFirstItem.toFixed(2)}`}
              </p>
            </>
          )}
        </fieldset>
      </PanelSection>

      <PanelSection title="Design and price">
        <fieldset disabled={disabled} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${node.id}-design`}>Design to print</Label>
            <select id={`${node.id}-design`} className={selectClass} value={str(config.designId) ?? ""} onChange={(event) => patch({ designId: event.target.value || null })}>
              <option value="">The final approved design (automatic)</option>
              {draft.data?.designs.map((design, index) => (
                <option key={design.id} value={design.id}>Design {index + 1} · {design.width}×{design.height}{design.isFinal ? " · final" : ""}</option>
              ))}
            </select>
            {!productId && <p className="text-muted-foreground text-xs">Choose the product on Product Input to pick a specific design.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${node.id}-profit`}>Profit per item (USD)</Label>
            <Input id={`${node.id}-profit`} type="number" min={0} max={500} step={1} value={profit}
              onChange={(event) => patch({ targetProfit: event.target.value === "" ? 0 : Number(event.target.value) })} />
            <p className="text-muted-foreground text-xs">
              Each size is priced from Printify&apos;s cost so a sale leaves about ${profit.toFixed(0)} after Etsy&apos;s fees, rounded up to .99. Larger sizes cost more.
            </p>
          </div>
        </fieldset>
      </PanelSection>

      <PanelSection title="On Etsy">
        <div className="space-y-4">
          <Toggle id={`${node.id}-publish`} label="Publish to Etsy" disabled={disabled} checked={config.publishToEtsy !== false}
            description="Off creates the product on Printify only, for you to publish there."
            onChange={(next) => patch({ publishToEtsy: next })} />
          <Toggle id={`${node.id}-media`} label="Add Podivo mock-ups and video" disabled={disabled || config.publishToEtsy === false} checked={config.addMockups !== false}
            description="Puts up to five approved mock-ups and the approved video in front of Printify's own images. Needs Etsy connected on the Shop page."
            onChange={(next) => patch({ addMockups: next })} />
          <PanelNotice tone="info">Whether the Etsy listing starts active or as a draft follows your Printify store&apos;s publishing settings.</PanelNotice>
        </div>
      </PanelSection>
    </>
  );
}

/** Publish to Etsy: one draft listing from the product's listing content and approved media. */
export function EtsyPublishSettings({ node, disabled }: { node: WorkflowNode; disabled: boolean }) {
  const { config, patch } = useConfig(node);
  const productId = useWorkflowProductId();
  const physical = config.listingType === "physical";
  const draft = useQuery({ queryKey: ["etsy-draft", productId], queryFn: () => getEtsyDraft(productId), enabled: Boolean(productId), staleTime: 60_000 });
  const connected = draft.data?.connectionStatus === "connected";

  return (
    <>
      {draft.data && !connected && (
        <div className="px-5 pt-4">
          <PanelNotice tone="warning" action={<Button asChild size="sm" variant="outline"><Link href="/shop"><Store className="size-3.5" />Go to Shop</Link></Button>}>
            Connect your Etsy shop on the Shop page before running this step.
          </PanelNotice>
        </div>
      )}
      <PanelSection title="Listing" description="Title, description and tags come from Listing Content; the photos are the approved mock-ups. Etsy gets a draft to publish yourself.">
        <fieldset disabled={disabled} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name={`${node.id}-type`} checked={!physical} onChange={() => patch({ listingType: "download", shippingProfileId: null })} />Digital download</label>
              <label className="flex items-center gap-1.5"><input type="radio" name={`${node.id}-type`} checked={physical} onChange={() => patch({ listingType: "physical" })} />Physical item</label>
            </div>
            <p className="text-muted-foreground text-xs">
              {physical
                ? "Not linked to a print provider: for print-on-demand use Push to Printify, so orders are fulfilled automatically."
                : "Buyers download the approved designs (up to five files) after paying."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-price`}>Price{draft.data?.currency ? ` (${draft.data.currency})` : ""}</Label>
              <Input id={`${node.id}-price`} type="number" min={0.2} step={0.01} value={num(config.price) ?? ""} placeholder={physical ? "24.99" : "4.99"}
                onChange={(event) => patch({ price: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-quantity`}>Quantity</Label>
              <Input id={`${node.id}-quantity`} type="number" min={1} max={999} value={num(config.quantity) ?? 999}
                onChange={(event) => patch({ quantity: Number(event.target.value) || 1 })} />
            </div>
          </div>
          <TaxonomyPicker
            value={num(config.taxonomyId) && str(config.taxonomyPath) ? { id: num(config.taxonomyId)!, path: str(config.taxonomyPath)! } : null}
            onChange={(next) => patch({ taxonomyId: next.id, taxonomyPath: next.path })}
            initialQuery={physical ? "t-shirts" : "digital prints"}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-who`}>Who made it</Label>
              <select id={`${node.id}-who`} className={selectClass} value={str(config.whoMade) ?? "i_did"} onChange={(event) => patch({ whoMade: event.target.value })}>
                <option value="i_did">I did</option>
                <option value="collective">A member of my shop</option>
                <option value="someone_else">Another company or person</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-when`}>When it was made</Label>
              <select id={`${node.id}-when`} className={selectClass} value={str(config.whenMade) ?? "made_to_order"} onChange={(event) => patch({ whenMade: event.target.value })}>
                <option value="made_to_order">Made to order</option>
                <option value="2020_2026">2020–2026</option>
              </select>
            </div>
          </div>
          {physical && (
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-shipping`}>Shipping profile</Label>
              {!productId ? (
                <p className="text-muted-foreground text-xs">Choose the product on Product Input to load your shipping profiles.</p>
              ) : draft.data?.shippingProfiles.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">Your Etsy shop has no shipping profile yet.</p>
              ) : (
                <select id={`${node.id}-shipping`} className={selectClass} value={num(config.shippingProfileId) ?? ""}
                  onChange={(event) => patch({ shippingProfileId: Number(event.target.value) || null })}>
                  <option value="">Choose a shipping profile</option>
                  {draft.data?.shippingProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              )}
            </div>
          )}
          <Toggle id={`${node.id}-video`} label="Attach the approved video" disabled={disabled} checked={config.includeVideo !== false}
            description="The video the run approved goes on the listing." onChange={(next) => patch({ includeVideo: next })} />
        </fieldset>
      </PanelSection>
    </>
  );
}
