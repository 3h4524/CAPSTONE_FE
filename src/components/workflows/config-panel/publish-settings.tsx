"use client";

import { type ReactNode, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, KeyRound, Loader2, Store, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
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
  // Apply mock-up before this step is locked to one Printify template per type in its Printify colors, so the product always
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

  if (connection.isPending) return <p className="text-muted-foreground flex items-center gap-2 px-5 py-5 text-xs"><Loader2 className="size-3.5 animate-spin" />{t("workflowConfig.publish.checkingPrintify")}</p>;
  if (!ready)
    return (
      <div className="px-5 py-5">
        <PanelNotice tone="warning" action={<Button asChild size="sm" variant="outline"><Link href="/api-keys"><KeyRound className="size-3.5" />{t("workflowConfig.publish.openApiKeys")}</Link></Button>}>
          {connection.data?.status === "no_store"
            ? t("workflowConfig.publish.noStore")
            : t("workflowConfig.publish.addApiKey")}
        </PanelNotice>
      </div>
    );

  // Only the three choices a seller makes stay in view (what is made, the profit, Etsy); the rules behind them and the
  // rarely changed settings fold away.
  return (
    <>
      <PanelSection title={t("workflowConfig.publish.product")} description={shopTitle ? t("workflowConfig.publish.madeByStore", { shop: shopTitle }) : undefined}>
        {fromMockup ? (
          <>
            <ul className="space-y-2 text-sm">
              {Object.entries(chosen).map(([type, setup]) => (
                <li key={type} className="border-ink-200 rounded-md border p-2.5">
                  <p className="text-ink-900 font-medium">{t(`batches.productTypes.${type.toLowerCase()}`, { defaultValue: productTypeLabel(type) })}: {setup.blueprintTitle ?? t("workflowConfig.publish.productNumber", { id: setup.blueprintId })}</p>
                  <p className="text-muted-foreground text-xs">
                    {setup.printProviderTitle ?? t("workflowConfig.publish.noProvider")} · {setup.colors.join(", ") || t("workflowConfig.publish.noColor")} · {setup.sizes.join(", ") || t("workflowConfig.publish.noSize")}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.setOnApplyMockup")}</p>
          </>
        ) : (
          <>
            {!hasApplyMockup && (
              <Segmented
                label={t("workflowConfig.publish.sourceLabel")}
                value={source}
                disabled={disabled}
                options={[{ value: "mockup", label: t("workflowConfig.publish.matchMockups") }, { value: "manual", label: t("workflowConfig.publish.chooseMyself") }]}
                onChange={(next) => patch({ source: next })}
              />
            )}
            {source === "mockup" ? (
              <>
                <p className="text-muted-foreground text-xs">
                  {hasApplyMockup
                    ? t("workflowConfig.publish.fromApplyMockup")
                    : t("workflowConfig.publish.pickedFromMockups")}
                </p>
                <Fold title={t("workflowConfig.publish.howMatched")}>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>{t("workflowConfig.publish.matchProduct")}</li>
                    <li>{t("workflowConfig.publish.matchColors")}</li>
                    <li>{t("workflowConfig.publish.matchProvider")}</li>
                    <li>{t("workflowConfig.publish.placementNote")}</li>
                    <li>{t("workflowConfig.publish.matchBackSleeves")}</li>
                    {!hasApplyMockup && <li>{t("workflowConfig.publish.ownTemplatesNote")}</li>}
                  </ul>
                </Fold>
              </>
            ) : (
              <fieldset disabled={disabled} className="space-y-4">
                <BlueprintPicker
                  value={blueprintId ? { id: blueprintId, title: str(config.blueprintTitle) ?? t("workflowConfig.publish.productNumber", { id: blueprintId }) } : null}
                  onChange={(next) => patch({ blueprintId: next.id, blueprintTitle: next.title, printProviderId: null, printProviderTitle: null, colors: [], sizes: [] })}
                />
                <div className="space-y-1.5">
                  <Label htmlFor={`${node.id}-provider`}>{t("workflowConfig.publish.printProvider")}</Label>
                  <PanelSelect id={`${node.id}-provider`} value={providerId ? String(providerId) : ""} disabled={disabled || !providers.data?.length}
                    placeholder={providers.isFetching ? t("workflowConfig.publish.loadingProviders") : blueprintId ? t("workflowConfig.publish.chooseProvider") : t("workflowConfig.publish.chooseProductFirst")}
                    options={(providers.data ?? []).map((item) => ({ value: String(item.id), label: `${item.title}${item.country ? ` — ${item.country}` : ""}` }))}
                    onChange={(next) => {
                      const picked = providers.data?.find((item) => item.id === Number(next));
                      patch({ printProviderId: picked?.id ?? null, printProviderTitle: picked?.title ?? null, colors: [], sizes: [] });
                    }} />
                </div>
                {catalog.isFetching && <p className="text-muted-foreground flex items-center gap-2 text-xs"><Loader2 className="size-3.5 animate-spin" />{t("workflowConfig.publish.loadingColorsSizes")}</p>}
                {catalog.data && (
                  <>
                    <PickerChips label={t("workflowConfig.publish.colors")} swatch options={catalog.data.colors} selected={colors}
                      actions={colors.length > 0 && <QuickAction label={t("workflowConfig.publish.clear")} onClick={() => patch({ colors: [] })} />}
                      onToggle={(value) => toggle("colors", colors, value)} />
                    <PickerChips label={t("workflowConfig.publish.sizes")} options={catalogSizes} selected={sortSizes(sizes)}
                      actions={
                        <>
                          {catalogSizes.some((size) => COMMON_SIZES.includes(size)) && (
                            <QuickAction label="S–2XL" onClick={() => patch({ sizes: catalogSizes.filter((size) => COMMON_SIZES.includes(size)) })} />
                          )}
                          <QuickAction label={t("workflowConfig.publish.all")} onClick={() => patch({ sizes: catalogSizes })} />
                          {sizes.length > 0 && <QuickAction label={t("workflowConfig.publish.clear")} onClick={() => patch({ sizes: [] })} />}
                        </>
                      }
                      onToggle={(value) => toggle("sizes", sizes, value)} />
                    {tooManyVariants ? (
                      <PanelNotice tone="warning">{t("workflowConfig.publish.tooManyVariants", { count: variantCount, max: MAX_VARIANTS })}</PanelNotice>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {t("workflowConfig.publish.variantCount", { count: variantCount })}
                        {catalog.data.usShippingFirstItem != null && t("workflowConfig.publish.usShipping", { price: catalog.data.usShippingFirstItem.toFixed(2) })}
                      </p>
                    )}
                  </>
                )}
              </fieldset>
            )}
          </>
        )}
      </PanelSection>

      <PanelSection title={t("workflowConfig.publish.price")}>
        <div className="space-y-1.5">
          <Label htmlFor={`${node.id}-profit`}>{t("workflowConfig.publish.profitPerItem")}</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">$</span>
            <Input id={`${node.id}-profit`} className="pl-6" type="number" min={0} max={500} step={1} value={profit} disabled={disabled}
              onChange={(event) => patch({ targetProfit: event.target.value === "" ? 0 : Number(event.target.value) })} />
          </div>
          <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.profitHint")}</p>
        </div>
      </PanelSection>

      <PanelSection title="Etsy">
        <div className="space-y-4">
          <Toggle id={`${node.id}-publish`} label={t("workflowConfig.publish.publishToEtsy")} disabled={disabled} checked={publishToEtsy}
            description={publishToEtsy ? t("workflowConfig.publish.printifyLists") : t("workflowConfig.publish.staysOnPrintify")}
            onChange={(next) => patch({ publishToEtsy: next })} />
          {publishToEtsy && (
            <>
              <Toggle id={`${node.id}-media`} label={t("workflowConfig.publish.addMockups")} disabled={disabled} checked={addMockups}
                description={t("workflowConfig.publish.addMockupsHint")}
                onChange={(next) => patch({ addMockups: next })} />
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{t("workflowConfig.publish.partnerWarning")}</span>
              </p>
            </>
          )}
        </div>
      </PanelSection>

      <section aria-label={t("workflowConfig.publish.moreOptions")} className="border-t px-5 py-4">
        <Fold title={t("workflowConfig.publish.moreOptions")} strong>
          <div className="space-y-4">
            <fieldset disabled={disabled} className="space-y-1.5">
              <Label htmlFor={`${node.id}-design`}>{t("workflowConfig.publish.designToPrint")}</Label>
              <PanelSelect id={`${node.id}-design`} value={str(config.designId) ?? ""} disabled={disabled} noneLabel={t("workflowConfig.publish.finalDesign")}
                options={(draft.data?.designs ?? []).map((design, index) => ({
                  value: design.id,
                  label: `${t("workflowConfig.publish.designNumber", { number: index + 1, width: design.width, height: design.height })}${design.isFinal ? t("workflowConfig.publish.final") : ""}`,
                }))}
                onChange={(next) => patch({ designId: next || null })} />
              {!productId && <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.chooseProductForDesign")}</p>}
            </fieldset>
            {addMockups && (
              <fieldset disabled={disabled} className="space-y-1.5">
                <Label htmlFor={`${node.id}-lead`}>{t("workflowConfig.publish.firstPhoto")}</Label>
                <PanelSelect id={`${node.id}-lead`} value={leadPhoto} disabled={disabled}
                  options={[{ value: "printify", label: t("workflowConfig.publish.printifyPhoto") }, { value: "apcs", label: t("workflowConfig.publish.firstMockup") }]}
                  onChange={(next) => patch({ leadPhoto: next })} />
              </fieldset>
            )}
            {publishToEtsy && (
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
                <li>{t("workflowConfig.publish.addPartnerNote")}</li>
                <li>{t("workflowConfig.publish.aiDisclosure")}</li>
                <li>{t("workflowConfig.publish.paceNote")}</li>
                <li>{t("workflowConfig.publish.activeOrDraft")}</li>
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
  const { t } = useTranslation("common");
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
          <PanelNotice tone="warning" action={<Button asChild size="sm" variant="outline"><Link href="/shop"><Store className="size-3.5" />{t("workflowConfig.publish.goToShop")}</Link></Button>}>
            {t("workflowConfig.publish.connectEtsy")}
          </PanelNotice>
        </div>
      )}
      <PanelSection title={t("workflowConfig.publish.listing")} description={t("workflowConfig.publish.listingDescription")}>
        <fieldset disabled={disabled} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("workflowConfig.publish.type")}</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name={`${node.id}-type`} checked={!physical} onChange={() => patch({ listingType: "download", shippingProfileId: null })} />{t("workflowConfig.publish.digitalDownload")}</label>
              <label className="flex items-center gap-1.5"><input type="radio" name={`${node.id}-type`} checked={physical} onChange={() => patch({ listingType: "physical" })} />{t("workflowConfig.publish.physicalItem")}</label>
            </div>
            <p className="text-muted-foreground text-xs">
              {physical
                ? t("workflowConfig.publish.physicalHint")
                : t("workflowConfig.publish.digitalHint")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-price`}>{t("workflowConfig.publish.price")}{draft.data?.currency ? ` (${draft.data.currency})` : ""}</Label>
              <Input id={`${node.id}-price`} type="number" min={0.2} step={0.01} value={num(config.price) ?? ""} placeholder={physical ? "24.99" : "4.99"}
                onChange={(event) => patch({ price: event.target.value === "" ? null : Number(event.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-quantity`}>{t("workflowConfig.publish.quantity")}</Label>
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
              <Label htmlFor={`${node.id}-who`}>{t("workflowConfig.publish.whoMade")}</Label>
              <PanelSelect id={`${node.id}-who`} value={str(config.whoMade) ?? "i_did"} disabled={disabled}
                options={[{ value: "i_did", label: t("workflowConfig.publish.iDid") }, { value: "collective", label: t("workflowConfig.publish.shopMember") }, { value: "someone_else", label: t("workflowConfig.publish.someoneElse") }]}
                onChange={(next) => patch({ whoMade: next })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-when`}>{t("workflowConfig.publish.whenMade")}</Label>
              <PanelSelect id={`${node.id}-when`} value={str(config.whenMade) ?? "made_to_order"} disabled={disabled}
                options={[{ value: "made_to_order", label: t("workflowConfig.publish.madeToOrder") }, { value: "2020_2026", label: "2020–2026" }]}
                onChange={(next) => patch({ whenMade: next })} />
            </div>
          </div>
          {physical && (
            <div className="space-y-1.5">
              <Label htmlFor={`${node.id}-shipping`}>{t("workflowConfig.publish.shippingProfile")}</Label>
              {!productId ? (
                <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.chooseProductForShipping")}</p>
              ) : draft.data?.shippingProfiles.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">{t("workflowConfig.publish.noShippingProfile")}</p>
              ) : (
                <PanelSelect id={`${node.id}-shipping`} value={num(config.shippingProfileId) ? String(num(config.shippingProfileId)) : ""} disabled={disabled}
                  placeholder={t("workflowConfig.publish.chooseShippingProfile")}
                  options={(draft.data?.shippingProfiles ?? []).map((option) => ({ value: String(option.id), label: option.label }))}
                  onChange={(next) => patch({ shippingProfileId: Number(next) || null })} />
              )}
            </div>
          )}
          {physical && (
            <div className="space-y-1.5">
              <Label>{t("workflowConfig.publish.whoProduces")}</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${node.id}-made-by`} checked={madeBy === "me"} onChange={() => patch({ madeBy: "me", productionPartnerIds: [] })} />{t("workflowConfig.publish.makeMyself")}
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`${node.id}-made-by`} checked={madeBy === "partner"} onChange={() => patch({ madeBy: "partner" })} />{t("workflowConfig.publish.productionPartner")}
                </label>
              </div>
              {madeBy === "partner" &&
                (!productId ? (
                  <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.chooseProductForPartners")}</p>
                ) : draft.data?.productionPartners.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    {t("workflowConfig.publish.noPartner")}
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
              <p className="text-muted-foreground text-xs">{t("workflowConfig.publish.partnerRequired")}</p>
            </div>
          )}
          <Toggle id={`${node.id}-video`} label={t("workflowConfig.publish.attachVideo")} disabled={disabled} checked={config.includeVideo !== false}
            description={t("workflowConfig.publish.attachVideoHint")} onChange={(next) => patch({ includeVideo: next })} />
          <PanelNotice tone="info">{t("workflowConfig.publish.aiDisclosure")}</PanelNotice>
          <PanelNotice tone="info">{t("workflowConfig.publish.paceNote")}</PanelNotice>
        </fieldset>
      </PanelSection>
    </>
  );
}
