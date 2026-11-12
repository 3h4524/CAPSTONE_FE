"use client";

import { type ReactNode, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, KeyRound, Loader2, Store, TriangleAlert } from "lucide-react";

import { getPrintifyCatalog, getPrintifyConnection, getPrintifyDraft, getPrintifyProviders } from "@/api/printify";
import { getEtsyDraft } from "@/api/shop";
import { TaxonomyPicker } from "@/components/shop/etsy-publish-dialog";
import { BlueprintPicker } from "@/components/shop/printify-publish-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PanelSection } from "@/components/workflows/config-panel/layout/panel-section";
import { PANEL_SELECT_CONTENT_CLASS } from "@/constants/workflow-panel";
import { productTypeLabel } from "@/helpers/mockup-template";
import { printifyColorHex, readPrintifyProducts } from "@/helpers/printify-source";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query";

/** Every design here is made by an image model, and Etsy requires a listing to say so; the server adds the sentence. */
const AI_DISCLOSURE_NOTE =
  "Etsy requires listings to say when AI made the design, so a sentence saying it was created with AI image tools from your prompts is added to the end of the description.";

/** The pace the server keeps; a step that reaches it waits and carries on by itself. */
const PACE_NOTE =
  "A young Etsy shop that adds many listings at once looks like spam to Etsy. Under 30 days old, APCS adds up to 3 listings an hour and 10 a day (25 a day under 90 days, then 100); a step past that waits its turn and carries on by itself.";

/** Where the print goes when the product follows the mock-ups. */
const PLACEMENT_NOTE =
  "The design is printed where the front mock-up places it, at the same size. A design smaller than the print is enlarged for Printify, and the step warns when it may print soft.";

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

/** Etsy refuses a listing with more variants than this. */
const MAX_VARIANTS = 100;

/** Sizes in the order a buyer reads them; a size not listed keeps Printify's order, after these. */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];
const sizeRank = (size: string) => {
  const index = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  return index === -1 ? SIZE_ORDER.length : index;
};
const sortSizes = (sizes: string[]) => [...sizes].sort((left, right) => sizeRank(left) - sizeRank(right));

/** The sizes most shirts sell in, offered as one click. */
const COMMON_SIZES = ["S", "M", "L", "XL", "2XL"];

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50">
      {label}
    </button>
  );
}

/** Chips to pick from, each color with its swatch; a header line counts the picks and offers quick actions. */
function PickerChips({ label, options, selected, swatch, actions, onToggle }: {
  label: string;
  options: string[];
  selected: string[];
  swatch?: boolean;
  actions?: ReactNode;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label} <span className="text-ink-500 font-normal">({selected.length}/{options.length})</span></Label>
        <div className="flex items-center gap-3">{actions}</div>
      </div>
      <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((option) => {
          const on = selected.includes(option);
          const hex = swatch ? printifyColorHex(option) : null;
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} aria-pressed={on} title={hex ? `${option} ${hex}` : option}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-ink-200 text-ink-600 hover:border-ink-300"}`}>
              {swatch && (
                <span className="border-ink-300 size-3 shrink-0 rounded-full border" style={{ background: hex ?? "repeating-linear-gradient(45deg,#e2e8f0 0 2px,#fff 2px 4px)" }} />
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Two or three choices side by side, one always picked: lighter than a select for a short either/or. */
function Segmented({ label, value, options, disabled, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="bg-ink-100 grid grid-flow-col gap-1 rounded-md p-1">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button key={option.value} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(option.value)}
              className={`rounded px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${on ? "bg-card text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"}`}>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Radix Select rejects an empty item value, so "no choice" travels as this marker.
const NONE_VALUE = "__none__";

/** The system dropdown, as the other node panels show it; `noneLabel` adds a choice that clears the value. */
function PanelSelect({ id, value, options, placeholder, noneLabel, disabled, onChange }: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  noneLabel?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <Select value={value || (noneLabel ? NONE_VALUE : undefined)} onValueChange={(next) => onChange(next === NONE_VALUE ? "" : next)} disabled={disabled}>
      <SelectTrigger id={id} className="bg-card w-full min-w-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className={cn(PANEL_SELECT_CONTENT_CLASS, "w-(--radix-select-trigger-width)")}>
        {noneLabel && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Details a seller rarely needs, closed until asked for. */
function Fold({ title, strong, children }: { title: string; strong?: boolean; children: ReactNode }) {
  return (
    <details className="group text-xs">
      <summary className={`flex cursor-pointer list-none items-center gap-1 select-none ${strong ? "text-ink-700 text-sm font-medium" : "text-blue-600 hover:underline"}`}>
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className={strong ? "mt-4" : "text-muted-foreground mt-2 leading-relaxed"}>{children}</div>
    </details>
  );
}

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
  // Apply mock-up sets the Printify product per product type from its templates; this node only shows it. A workflow
  // saved before that keeps its own product here, still editable.
  const mockupConfig = useWorkflowStore((state) => state.nodes.find((item) => item.data.type === "apply-mockup")?.data.config);
  const chosen = readPrintifyProducts(mockupConfig);
  const fromMockup = Object.keys(chosen).length > 0;
  // Apply mock-up before this step is locked to one Printify template in its Printify colors, so the product always
  // follows the mock-ups: choosing another one here would ship a garment the listing does not show.
  const hasApplyMockup = mockupConfig !== undefined;
  // As the server reads it: unset, a node with a product keeps it and one without reads the approved mock-ups.
  const savedSource = config.source === "mockup" || config.source === "manual" ? config.source : blueprintId ? "manual" : "mockup";
  const source = hasApplyMockup ? "mockup" : savedSource;
  // A workflow saved with its own product before Apply mock-up was added is moved to the mock-ups, as the panel shows it.
  useEffect(() => {
    if (hasApplyMockup && !disabled && config.source !== "mockup") patch({ source: "mockup" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patch is rebuilt each render; the source is what changes
  }, [hasApplyMockup, disabled, config.source]);
  // As the step decides: Printify's photo leads once the product follows the mock-ups, so the listing opens on what ships.
  const leadPhoto =
    config.leadPhoto === "printify" || config.leadPhoto === "apcs" ? config.leadPhoto : fromMockup || source === "mockup" ? "printify" : "apcs";

  const connection = useQuery({ queryKey: ["printify-connection-node"], queryFn: () => getPrintifyConnection(), staleTime: 60_000 });
  const ready = connection.data?.status === "connected";
  const draft = useQuery({ queryKey: ["printify-draft", productId], queryFn: () => getPrintifyDraft(productId), enabled: ready && Boolean(productId), staleTime: 60_000 });
  const providers = useQuery({ queryKey: ["printify-providers", blueprintId], queryFn: () => getPrintifyProviders(blueprintId!), enabled: ready && Boolean(blueprintId), staleTime: 60 * 60_000 });
  const catalog = useQuery({ queryKey: ["printify-catalog", blueprintId, providerId], queryFn: () => getPrintifyCatalog(blueprintId!, providerId!), enabled: ready && Boolean(blueprintId && providerId), staleTime: 60 * 60_000 });
  const variantCount = (catalog.data?.variants ?? []).filter((variant) => (!variant.color || colors.includes(variant.color)) && (!variant.size || sizes.includes(variant.size))).length;
  const tooManyVariants = variantCount > MAX_VARIANTS;
  const catalogSizes = sortSizes(catalog.data?.sizes ?? []);
  const publishToEtsy = config.publishToEtsy !== false;

  const toggle = (key: "colors" | "sizes", list: string[], value: string) =>
    patch({ [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] });

  const addMockups = publishToEtsy && config.addMockups !== false;
  const shopTitle = connection.data?.shopTitle;

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

  // Only the three choices a seller makes stay in view (what is made, the profit, Etsy); the rules behind them and the
  // rarely changed settings fold away.
  return (
    <>
      <PanelSection title="Product" description={shopTitle ? `Made and shipped by your Printify store "${shopTitle}".` : undefined}>
        {fromMockup ? (
          <>
            <ul className="space-y-2 text-sm">
              {Object.entries(chosen).map(([type, setup]) => (
                <li key={type} className="border-ink-200 rounded-md border p-2.5">
                  <p className="text-ink-900 font-medium">{productTypeLabel(type)}: {setup.blueprintTitle ?? `Product ${setup.blueprintId}`}</p>
                  <p className="text-muted-foreground text-xs">
                    {setup.printProviderTitle ?? "No provider"} · {setup.colors.join(", ") || "no color"} · {setup.sizes.join(", ") || "no size"}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">Set on Apply mock-up. Change it there.</p>
          </>
        ) : (
          <>
            {!hasApplyMockup && (
              <Segmented
                label="Product, colors and provider"
                value={source}
                disabled={disabled}
                options={[{ value: "mockup", label: "Match the mock-ups" }, { value: "manual", label: "Choose myself" }]}
                onChange={(next) => patch({ source: next })}
              />
            )}
            {source === "mockup" ? (
              <>
                <p className="text-muted-foreground text-xs">
                  {hasApplyMockup
                    ? "Printify makes the garment and colors chosen on Apply mock-up, printed where the approved mock-ups show the design."
                    : "Picked from the approved mock-ups when the step runs."}
                </p>
                <Fold title="How it is matched">
                  <ul className="list-disc space-y-1 pl-4">
                    <li>Product: the Printify product the template shows.</li>
                    <li>Colors: each garment color of the approved mock-ups.</li>
                    <li>Provider: the template&apos;s own, or one that makes all those colors, US first.</li>
                    <li>{PLACEMENT_NOTE}</li>
                    <li>Back and sleeves: the design is printed there too, as their mock-ups show it, when the provider prints that side.</li>
                    {!hasApplyMockup && <li>Mock-ups made with your own templates cannot be matched: choose the product yourself instead.</li>}
                  </ul>
                </Fold>
              </>
            ) : (
              <fieldset disabled={disabled} className="space-y-4">
                <BlueprintPicker
                  value={blueprintId ? { id: blueprintId, title: str(config.blueprintTitle) ?? `Product ${blueprintId}` } : null}
                  onChange={(next) => patch({ blueprintId: next.id, blueprintTitle: next.title, printProviderId: null, printProviderTitle: null, colors: [], sizes: [] })}
                />
                <div className="space-y-1.5">
                  <Label htmlFor={`${node.id}-provider`}>Print provider</Label>
                  <PanelSelect id={`${node.id}-provider`} value={providerId ? String(providerId) : ""} disabled={disabled || !providers.data?.length}
                    placeholder={providers.isFetching ? "Loading providers…" : blueprintId ? "Choose a provider (US first)" : "Choose a product first"}
                    options={(providers.data ?? []).map((item) => ({ value: String(item.id), label: `${item.title}${item.country ? ` — ${item.country}` : ""}` }))}
                    onChange={(next) => {
                      const picked = providers.data?.find((item) => item.id === Number(next));
                      patch({ printProviderId: picked?.id ?? null, printProviderTitle: picked?.title ?? null, colors: [], sizes: [] });
                    }} />
                </div>
                {catalog.isFetching && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2 className="size-3.5 animate-spin" />Loading colors and sizes…</p>}
                {catalog.data && (
                  <>
                    <PickerChips label="Colors" swatch options={catalog.data.colors} selected={colors}
                      actions={colors.length > 0 && <QuickAction label="Clear" onClick={() => patch({ colors: [] })} />}
                      onToggle={(value) => toggle("colors", colors, value)} />
                    <PickerChips label="Sizes" options={catalogSizes} selected={sortSizes(sizes)}
                      actions={
                        <>
                          {catalogSizes.some((size) => COMMON_SIZES.includes(size)) && (
                            <QuickAction label="S–2XL" onClick={() => patch({ sizes: catalogSizes.filter((size) => COMMON_SIZES.includes(size)) })} />
                          )}
                          <QuickAction label="All" onClick={() => patch({ sizes: catalogSizes })} />
                          {sizes.length > 0 && <QuickAction label="Clear" onClick={() => patch({ sizes: [] })} />}
                        </>
                      }
                      onToggle={(value) => toggle("sizes", sizes, value)} />
                    {tooManyVariants ? (
                      <PanelNotice tone="warning">{variantCount} variants: Etsy allows {MAX_VARIANTS}. Choose fewer colors or sizes.</PanelNotice>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {variantCount} variant(s)
                        {catalog.data.usShippingFirstItem != null && ` · US shipping $${catalog.data.usShippingFirstItem.toFixed(2)}`}
                      </p>
                    )}
                  </>
                )}
              </fieldset>
            )}
          </>
        )}
      </PanelSection>

      <PanelSection title="Price">
        <div className="space-y-1.5">
          <Label htmlFor={`${node.id}-profit`}>Profit per item</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
            <Input id={`${node.id}-profit`} className="pl-6" type="number" min={0} max={500} step={1} value={profit} disabled={disabled}
              onChange={(event) => patch({ targetProfit: event.target.value === "" ? 0 : Number(event.target.value) })} />
          </div>
          <p className="text-muted-foreground text-xs">After Etsy fees. Each size is priced from its Printify cost, so larger sizes cost more.</p>
        </div>
      </PanelSection>

      <PanelSection title="Etsy">
        <div className="space-y-4">
          <Toggle id={`${node.id}-publish`} label="Publish to Etsy" disabled={disabled} checked={publishToEtsy}
            description={publishToEtsy ? "Printify lists it on your Etsy shop." : "The product stays on Printify for you to publish."}
            onChange={(next) => patch({ publishToEtsy: next })} />
          {publishToEtsy && (
            <>
              <Toggle id={`${node.id}-media`} label="Add mock-ups and video" disabled={disabled} checked={addMockups}
                description="Your approved mock-ups and video go on the listing."
                onChange={(next) => patch({ addMockups: next })} />
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>Etsy needs Printify set as a production partner. See More options.</span>
              </p>
            </>
          )}
        </div>
      </PanelSection>

      <section aria-label="More options" className="border-t px-5 py-4">
        <Fold title="More options" strong>
          <div className="space-y-4">
            <fieldset disabled={disabled} className="space-y-1.5">
              <Label htmlFor={`${node.id}-design`}>Design to print</Label>
              <PanelSelect id={`${node.id}-design`} value={str(config.designId) ?? ""} disabled={disabled} noneLabel="The final approved design"
                options={(draft.data?.designs ?? []).map((design, index) => ({
                  value: design.id,
                  label: `Design ${index + 1} · ${design.width}×${design.height}${design.isFinal ? " · final" : ""}`,
                }))}
                onChange={(next) => patch({ designId: next || null })} />
              {!productId && <p className="text-muted-foreground text-xs">Choose the product on Product Input to pick a specific design.</p>}
            </fieldset>
            {addMockups && (
              <fieldset disabled={disabled} className="space-y-1.5">
                <Label htmlFor={`${node.id}-lead`}>First listing photo</Label>
                <PanelSelect id={`${node.id}-lead`} value={leadPhoto} disabled={disabled}
                  options={[{ value: "printify", label: "Printify's photo of the garment" }, { value: "apcs", label: "Your first approved mock-up" }]}
                  onChange={(next) => patch({ leadPhoto: next })} />
              </fieldset>
            )}
            {publishToEtsy && (
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
                <li>Add Printify under Etsy Shop Manager &gt; Settings &gt; Production partners. Publishing stops while your shop has none.</li>
                <li>{AI_DISCLOSURE_NOTE}</li>
                <li>{PACE_NOTE}</li>
                <li>Whether the listing starts active or as a draft follows your Printify store&apos;s publishing settings.</li>
              </ul>
            )}
          </div>
        </Fold>
      </section>
    </>
  );
}

/** Publish to Etsy: one draft listing from the product's listing content and approved media. */
export function EtsyPublishSettings({ node, disabled }: { node: WorkflowNode; disabled: boolean }) {
  const { config, patch } = useConfig(node);
  const productId = useWorkflowProductId();
  const physical = config.listingType === "physical";
  const madeBy = config.madeBy === "me" || config.madeBy === "partner" ? config.madeBy : null;
  const partnerIds = Array.isArray(config.productionPartnerIds) ? config.productionPartnerIds.filter((id): id is number => typeof id === "number") : [];
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
              <PanelSelect id={`${node.id}-who`} value={str(config.whoMade) ?? "i_did"} disabled={disabled}
                options={[{ value: "i_did", label: "I did" }, { value: "collective", label: "A member of my shop" }, { value: "someone_else", label: "Another company or person" }]}
                onChange={(next) => patch({ whoMade: next })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-when`}>When it was made</Label>
              <PanelSelect id={`${node.id}-when`} value={str(config.whenMade) ?? "made_to_order"} disabled={disabled}
                options={[{ value: "made_to_order", label: "Made to order" }, { value: "2020_2026", label: "2020–2026" }]}
                onChange={(next) => patch({ whenMade: next })} />
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
                <PanelSelect id={`${node.id}-shipping`} value={num(config.shippingProfileId) ? String(num(config.shippingProfileId)) : ""} disabled={disabled}
                  placeholder="Choose a shipping profile"
                  options={(draft.data?.shippingProfiles ?? []).map((option) => ({ value: String(option.id), label: option.label }))}
                  onChange={(next) => patch({ shippingProfileId: Number(next) || null })} />
              )}
            </div>
          )}
          {physical && (
            <div className="space-y-1.5">
              <Label>Who produces it</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${node.id}-made-by`} checked={madeBy === "me"} onChange={() => patch({ madeBy: "me", productionPartnerIds: [] })} />I make it myself
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${node.id}-made-by`} checked={madeBy === "partner"} onChange={() => patch({ madeBy: "partner" })} />A production partner
                </label>
              </div>
              {madeBy === "partner" &&
                (!productId ? (
                  <p className="text-muted-foreground text-xs">Choose the product on Product Input to load your production partners.</p>
                ) : draft.data?.productionPartners.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Your Etsy shop lists no production partner. Add the print shop under Shop Manager &gt; Settings &gt; Production partners, then reopen this step.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {draft.data?.productionPartners.map((partner) => (
                      <label key={partner.id} className="flex items-center gap-1.5 text-sm">
                        <input type="checkbox" checked={partnerIds.includes(partner.id)}
                          onChange={() => patch({ productionPartnerIds: partnerIds.includes(partner.id) ? partnerIds.filter((id) => id !== partner.id) : [...partnerIds, partner.id] })} />
                        {partner.label}
                      </label>
                    ))}
                  </div>
                ))}
              <p className="text-muted-foreground text-xs">Etsy requires a listing to name the partner that makes it. Hiding it can get the shop suspended.</p>
            </div>
          )}
          <Toggle id={`${node.id}-video`} label="Attach the approved video" disabled={disabled} checked={config.includeVideo !== false}
            description="The video the run approved goes on the listing." onChange={(next) => patch({ includeVideo: next })} />
          <PanelNotice tone="info">{AI_DISCLOSURE_NOTE}</PanelNotice>
          <PanelNotice tone="info">{PACE_NOTE}</PanelNotice>
        </fieldset>
      </PanelSection>
    </>
  );
}
