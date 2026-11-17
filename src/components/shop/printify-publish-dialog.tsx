"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ExternalLink, KeyRound, Loader2, Printer, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  createPrintifyProduct, getPrintifyCatalog, getPrintifyDraft, getPrintifyProviders, type PrintifyBlueprint, type PrintifyDraft,
  type PrintifyProduct, publishPrintifyProduct, searchPrintifyBlueprints, syncPrintifyProduct,
} from "@/api/printify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/helpers/error-message";
import { useMutation, useQuery } from "@tanstack/react-query";

const MAX_TITLE = 140;
const MAX_TAGS = 13;
const MAX_VARIANTS = 100;
const MAX_ATTACHED = 10;
const POLL_MS = 8000;
const PREFERRED_COLORS = ["White", "Black"];
const PREFERRED_SIZES = ["S", "M", "L", "XL", "2XL"];

/** Why a push cannot start yet, and where the seller fixes it. */
const NOT_READY_STATUSES = ["not_connected", "key_invalid", "no_store", "unavailable"];

const selectClass = "h-9 w-full rounded-md border border-ink-200 bg-card px-2 text-sm text-ink-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none";
const money = (value: number) => `$${value.toFixed(2)}`;

/** Etsy's US fees (6.5% transaction, 3% + $0.25 payment on price plus shipping, $0.20 listing); the server uses the same estimate. */
const estimate = (price: number, cost: number, shipping: number) => {
  const fees = Math.round(((price + shipping) * 0.095 + 0.45) * 100) / 100;
  return { fees, profit: Math.round((price - cost - fees) * 100) / 100 };
};

/**
 * Print-on-demand through the seller's Printify store: create the product on Printify, price it against Printify's
 * cost, then let Printify publish it to Etsy (where it fulfils orders) and add the APCS mock-ups to that listing.
 */
export function PrintifyPublishDialog({ productId, open, onOpenChange }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("common");
  const draftQuery = useQuery({ queryKey: ["printify-draft", productId], queryFn: () => getPrintifyDraft(productId), enabled: open, staleTime: 0 });
  const [product, setProduct] = useState<PrintifyProduct | null>(null);
  const draft = draftQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Printer className="size-5 text-emerald-600 dark:text-emerald-400" />{t("shop.printifyPublish.title")}</DialogTitle>
          <DialogDescription>{t("shop.printifyPublish.description")}</DialogDescription>
        </DialogHeader>
        <Steps current={!product ? 1 : product.state === "created" ? 2 : 3} />
        {draftQuery.isPending ? (
          <p className="text-ink-500 flex items-center gap-2 py-10 text-sm"><Loader2 className="size-4 animate-spin" />{t("shop.printifyPublish.preparing")}</p>
        ) : draftQuery.isError || !draft ? (
          <p className="py-6 text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(draftQuery.error) || t("shop.etsyPublish.loadError")}</p>
        ) : draft.connection.status !== "connected" ? (
          <div className="text-ink-700 space-y-3 py-4 text-sm">
            <p>{t(`shop.printifyPublish.notReady.${NOT_READY_STATUSES.includes(draft.connection.status) ? draft.connection.status : "not_connected"}`)}</p>
            {draft.connection.status !== "unavailable" && draft.connection.status !== "no_store" && (
              <Button asChild size="sm"><Link href="/api-keys"><KeyRound className="size-4" />{t("shop.printifyPublish.openApiKeys")}</Link></Button>
            )}
          </div>
        ) : !product ? (
          <CreateStep draft={draft} productId={productId} onCreated={setProduct} />
        ) : product.state === "created" ? (
          <PriceStep draft={draft} product={product} onPublished={setProduct} />
        ) : (
          <PublishStep draft={draft} product={product} onChange={setProduct} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Steps({ current }: { current: number }) {
  const { t } = useTranslation("common");
  const steps = [t("shop.printifyPublish.steps.create"), t("shop.printifyPublish.steps.prices"), t("shop.printifyPublish.steps.publish")];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((label, index) => (
        <li key={label} className={`flex items-center gap-1.5 ${index + 1 === current ? "text-ink-900 font-semibold" : index + 1 < current ? "text-emerald-700 dark:text-emerald-300" : "text-ink-400"}`}>
          <span className={`flex size-5 items-center justify-center rounded-full text-[11px] ${index + 1 < current ? "bg-emerald-600 text-white" : index + 1 === current ? "bg-ink-900 text-card" : "bg-ink-200 text-ink-500"}`}>
            {index + 1 < current ? <Check className="size-3" /> : index + 1}
          </span>
          {label}
          {index < steps.length - 1 && <span className="bg-ink-200 mx-1 h-px w-6" />}
        </li>
      ))}
    </ol>
  );
}

function CreateStep({ draft, productId, onCreated }: { draft: PrintifyDraft; productId: string; onCreated: (product: PrintifyProduct) => void }) {
  const { t, i18n } = useTranslation("common");
  const defaults = draft.defaults;
  const [designId, setDesignId] = useState(draft.designs[0]?.id ?? null);
  const [blueprint, setBlueprint] = useState<Pick<PrintifyBlueprint, "id" | "title"> | null>(
    defaults.blueprintId ? { id: defaults.blueprintId, title: defaults.blueprintTitle ?? t("shop.printifyPublish.productNumber", { id: defaults.blueprintId }) } : null);
  const [providerId, setProviderId] = useState<number | null>(defaults.printProviderId);
  const [colors, setColors] = useState<string[]>(defaults.colors);
  const [sizes, setSizes] = useState<string[]>(defaults.sizes);
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [price, setPrice] = useState(String(defaults.price));
  const resumable = draft.history.find((row) => row.printifyProductId && row.state !== "failed");

  const providersQuery = useQuery({
    queryKey: ["printify-providers", blueprint?.id], queryFn: () => getPrintifyProviders(blueprint!.id), enabled: Boolean(blueprint), staleTime: 60 * 60_000,
  });
  // A remembered provider that no longer makes this product falls back to the first (US providers come first).
  useEffect(() => {
    const providers = providersQuery.data;
    if (providers && !providers.some((provider) => provider.id === providerId)) setProviderId(providers[0]?.id ?? null);
  }, [providersQuery.data, providerId]);

  const catalogQuery = useQuery({
    queryKey: ["printify-catalog", blueprint?.id, providerId], queryFn: () => getPrintifyCatalog(blueprint!.id, providerId!),
    enabled: Boolean(blueprint && providerId), staleTime: 60 * 60_000,
  });
  const catalog = catalogQuery.data;
  // Start from the remembered colors and sizes this provider still makes, else white and black in the common sizes.
  useEffect(() => {
    if (!catalog) return;
    setColors((current) => {
      const kept = current.filter((color) => catalog.colors.includes(color));
      if (kept.length) return kept;
      const preferred = PREFERRED_COLORS.filter((color) => catalog.colors.includes(color));
      return preferred.length ? preferred : catalog.colors.slice(0, 2);
    });
    setSizes((current) => {
      const kept = current.filter((size) => catalog.sizes.includes(size));
      if (kept.length) return kept;
      const preferred = PREFERRED_SIZES.filter((size) => catalog.sizes.includes(size));
      return preferred.length ? preferred : catalog.sizes;
    });
  }, [catalog]);

  const variantIds = useMemo(() => (catalog?.variants ?? [])
    .filter((variant) => (!variant.color || colors.includes(variant.color)) && (!variant.size || sizes.includes(variant.size)))
    .map((variant) => variant.id), [catalog, colors, sizes]);
  const tags = useMemo(() => tagText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagText]);
  const priceValue = Number(price);
  const provider = providersQuery.data?.find((item) => item.id === providerId);
  const problems = [
    !designId && t("shop.printifyPublish.problems.design"),
    !blueprint && t("shop.printifyPublish.problems.productType"),
    !providerId && t("shop.printifyPublish.problems.provider"),
    variantIds.length === 0 && t("shop.printifyPublish.problems.variants"),
    variantIds.length > MAX_VARIANTS && t("shop.printifyPublish.problems.tooManyVariants", { max: MAX_VARIANTS, count: variantIds.length }),
    !title.trim() && t("shop.etsyPublish.problems.title"),
    !description.trim() && t("shop.etsyPublish.problems.description"),
    tags.length > MAX_TAGS && t("shop.printifyPublish.problems.tooManyTags", { max: MAX_TAGS }),
    !(priceValue >= 1) && t("shop.printifyPublish.problems.price"),
  ].filter(Boolean) as string[];

  const createMutation = useMutation({
    mutationFn: () => createPrintifyProduct(productId, {
      designId: designId!, blueprintId: blueprint!.id, blueprintTitle: blueprint!.title, printProviderId: providerId!,
      printProviderTitle: provider?.title ?? null, variantIds, title: title.trim(), description: description.trim(), tags, price: priceValue,
    }),
    onSuccess: onCreated,
  });
  const resumeMutation = useMutation({
    mutationFn: () => syncPrintifyProduct(productId, resumable!.printifyProductId!, { mockupIds: [] }),
    onSuccess: onCreated,
  });

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <div className="space-y-5">
      <Warnings items={draft.warnings} />
      {resumable && (
        <div className="border-ink-200 bg-ink-50 text-ink-600 flex flex-col gap-2 rounded-md border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>{t("shop.printifyPublish.lastSent", { date: new Date(resumable.attemptedAtUtc).toLocaleString(i18n.language) })} · {t(`shop.printifyPublish.states.${resumable.state}`, { defaultValue: resumable.state })}
            {resumable.etsyUrl && <> · <a className="underline" href={resumable.etsyUrl} target="_blank" rel="noreferrer">{t("shop.printifyPublish.etsyListing")}</a></>}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
            {resumeMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}{t("shop.printifyPublish.continueWith")}
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <Label>{t("shop.printifyPublish.designToPrint")}</Label>
        {draft.designs.length === 0 ? <p className="text-ink-500 text-sm">{t("shop.printifyPublish.noDesign")}</p> : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {draft.designs.map((design) => (
              <button key={design.id} type="button" onClick={() => setDesignId(design.id)} aria-pressed={designId === design.id}
                className={`relative overflow-hidden rounded-md border-2 ${designId === design.id ? "border-emerald-600" : "border-transparent opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.previewUrl} alt="" className="aspect-square w-full bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
                <span className="text-ink-500 block px-1 py-0.5 text-[10px]">{design.width}×{design.height}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <BlueprintPicker value={blueprint} onChange={(next) => { setBlueprint(next); setProviderId(null); }} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="printify-provider">{t("shop.printifyPublish.provider")}</Label>
          {providersQuery.isFetching ? <p className="text-ink-500 text-xs">{t("shop.printifyPublish.loadingProviders")}</p> : (
            <select id="printify-provider" className={selectClass} value={providerId ?? ""} disabled={!providersQuery.data?.length}
              onChange={(event) => setProviderId(Number(event.target.value) || null)}>
              {!providersQuery.data?.length && <option value="">{t("shop.printifyPublish.chooseTypeFirst")}</option>}
              {providersQuery.data?.map((item) => (
                <option key={item.id} value={item.id}>{item.title}{item.country ? ` — ${item.country}` : ""}</option>
              ))}
            </select>
          )}
          <p className="text-ink-500 text-xs">{t("shop.printifyPublish.providersHint")}</p>
        </div>
      </section>

      {catalog && (
        <section className="space-y-3">
          <ChipGroup label={t("shop.printifyPublish.colors")} options={catalog.colors} selected={colors} onToggle={(value) => toggle(colors, value, setColors)} />
          <ChipGroup label={t("shop.printifyPublish.sizes")} options={catalog.sizes} selected={sizes} onToggle={(value) => toggle(sizes, value, setSizes)} />
          <p className="text-ink-500 text-xs">
            {t("shop.printifyPublish.variantCount", { count: variantIds.length })}
            {catalog.usShippingFirstItem != null && ` · ${t("shop.printifyPublish.usShipping", { amount: money(catalog.usShippingFirstItem) })}${catalog.usShippingAdditionalItem != null ? `, ${t("shop.printifyPublish.eachExtra", { amount: money(catalog.usShippingAdditionalItem) })}` : ""}`}
          </p>
        </section>
      )}
      {catalogQuery.isError && <p className="text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(catalogQuery.error)}</p>}

      <section className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="printify-title">{t("shop.etsyPublish.fields.title")}</Label><span className={`text-xs ${title.length > MAX_TITLE ? "text-rose-600 dark:text-rose-400" : "text-ink-400"}`}>{title.length}/{MAX_TITLE}</span></div>
          <Input id="printify-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="printify-description">{t("shop.etsyPublish.fields.description")}</Label>
          <Textarea id="printify-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div className="space-y-1.5">
            <div className="flex justify-between"><Label htmlFor="printify-tags">{t("shop.etsyPublish.fields.tags")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.fields.commaSeparated")})</span></Label><span className="text-ink-400 text-xs">{tags.length}/{MAX_TAGS}</span></div>
            <Input id="printify-tags" value={tagText} onChange={(event) => setTagText(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="printify-price">{t("shop.printifyPublish.startingPrice")}</Label>
            <Input id="printify-price" type="number" min="1" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
        </div>
      </section>

      {(createMutation.isError || resumeMutation.isError) && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{getErrorMessage(createMutation.error ?? resumeMutation.error)}</p>
      )}
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-ink-500 text-xs">{problems[0] ?? t("shop.printifyPublish.createHint")}</p>
        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => createMutation.mutate()} disabled={problems.length > 0 || createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}{createMutation.isPending ? t("shop.printifyPublish.creating") : t("shop.printifyPublish.steps.create")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function PriceStep({ draft, product, onPublished }: { draft: PrintifyDraft; product: PrintifyProduct; onPublished: (product: PrintifyProduct) => void }) {
  const { t } = useTranslation("common");
  const [prices, setPrices] = useState<Record<number, string>>(() => Object.fromEntries(product.variants.map((variant) => [variant.id, variant.price.toFixed(2)])));
  const [bulk, setBulk] = useState("");
  const shipping = product.usShippingFirstItem ?? 0;
  const rows = product.variants.map((variant) => {
    const price = Number(prices[variant.id]);
    return { variant, price, ...estimate(price, variant.cost, shipping) };
  });
  const problems = rows.filter((row) => !(row.price >= 1)).length > 0 ? [t("shop.printifyPublish.problems.everyPrice")]
    : rows.some((row) => row.price < row.variant.cost) ? [t("shop.printifyPublish.problems.belowCost")] : [];
  const thin = rows.filter((row) => row.profit < 3).length;

  const publishMutation = useMutation({
    mutationFn: () => publishPrintifyProduct(product.productId, product.printifyProductId, rows.map((row) => ({ variantId: row.variant.id, price: row.price }))),
    onSuccess: onPublished,
  });

  return (
    <div className="space-y-4">
      <Warnings items={product.warnings} />
      {product.alreadyCreated && <p className="text-ink-500 text-xs">{t("shop.printifyPublish.alreadyCreated")}</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="printify-bulk" className="text-xs">{t("shop.printifyPublish.setEveryPrice")}</Label>
          <Input id="printify-bulk" className="h-8 w-28" type="number" min="1" step="0.01" placeholder="24.99" value={bulk} onChange={(event) => setBulk(event.target.value)} />
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!(Number(bulk) >= 1)}
          onClick={() => setPrices(Object.fromEntries(product.variants.map((variant) => [variant.id, Number(bulk).toFixed(2)])))}>{t("shop.printifyPublish.apply")}</Button>
        <Button type="button" size="sm" variant="ghost"
          onClick={() => setPrices(Object.fromEntries(product.variants.map((variant) => [variant.id, (Math.ceil(variant.cost + 12) - 0.01).toFixed(2)])))}>
          {t("shop.printifyPublish.suggest")}
        </Button>
      </div>
      <div className="border-ink-200 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500 text-xs">
            <tr><th className="px-3 py-2 text-left font-medium">{t("shop.printifyPublish.table.variant")}</th><th className="px-3 py-2 text-right font-medium">{t("shop.printifyPublish.table.cost")}</th><th className="px-3 py-2 text-right font-medium">{t("shop.printifyPublish.table.price")}</th><th className="px-3 py-2 text-right font-medium">{t("shop.printifyPublish.table.fees")}*</th><th className="px-3 py-2 text-right font-medium">{t("shop.printifyPublish.table.profit")}*</th></tr>
          </thead>
          <tbody className="divide-ink-100 divide-y">
            {rows.map(({ variant, price, fees, profit }) => (
              <tr key={variant.id}>
                <td className="text-ink-800 px-3 py-1.5">{variant.title}</td>
                <td className="text-ink-600 px-3 py-1.5 text-right tabular-nums">{money(variant.cost)}</td>
                <td className="px-3 py-1.5 text-right">
                  <Input className="ml-auto h-7 w-24 text-right" type="number" min="1" step="0.01" value={prices[variant.id]}
                    onChange={(event) => setPrices((current) => ({ ...current, [variant.id]: event.target.value }))} />
                </td>
                <td className="text-ink-500 px-3 py-1.5 text-right tabular-nums">{price >= 1 ? money(fees) : "—"}</td>
                <td className={`px-3 py-1.5 text-right font-medium tabular-nums ${profit < 0 ? "text-rose-600 dark:text-rose-400" : profit < 3 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-300"}`}>{price >= 1 ? money(profit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-500 text-xs">
        * {t("shop.printifyPublish.estimateNote", { shipping: money(shipping) })}
        {thin > 0 && <span className="text-amber-700 dark:text-amber-300"> {t("shop.printifyPublish.thinMargin", { count: thin })}</span>}
      </p>
      {publishMutation.isError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{getErrorMessage(publishMutation.error)}</p>}
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-ink-500 text-xs">{problems[0] ?? t("shop.printifyPublish.publishHint", { store: draft.connection.shopTitle ?? t("shop.printifyPublish.yourStore") })}</p>
        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => publishMutation.mutate()} disabled={problems.length > 0 || publishMutation.isPending}>
          {publishMutation.isPending && <Loader2 className="size-4 animate-spin" />}{publishMutation.isPending ? t("shop.printifyPublish.asking") : t("shop.printifyPublish.steps.publish")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function PublishStep({ draft, product, onChange }: { draft: PrintifyDraft; product: PrintifyProduct; onChange: (product: PrintifyProduct) => void }) {
  const { t } = useTranslation("common");
  const [mockupIds, setMockupIds] = useState<string[]>(draft.mockups.slice(0, 5).map((mockup) => mockup.id));
  const [attachRequested, setAttachRequested] = useState(false);
  const published = product.state === "published";

  // While Printify publishes in the background, ask again every few seconds.
  const syncMutation = useMutation({
    mutationFn: (media: { mockupIds: string[] }) => syncPrintifyProduct(product.productId, product.printifyProductId, media),
    onSuccess: onChange,
  });
  useEffect(() => {
    if (product.state !== "publishing") return;
    const timer = window.setTimeout(() => syncMutation.mutate({ mockupIds: [] }), POLL_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Printify takes the design and its mock-ups only: no video goes with the product.
  const attach = () => { setAttachRequested(true); syncMutation.mutate({ mockupIds }); };
  const toggle = (id: string) => setMockupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= MAX_ATTACHED ? current : [...current, id]);

  if (!published)
    return (
      <div className="text-ink-600 space-y-3 py-6 text-center text-sm">
        <Loader2 className="mx-auto size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-ink-900 font-medium">{t("shop.printifyPublish.publishing")}</p>
        <p>{t("shop.printifyPublish.publishingHint")}</p>
        <Warnings items={product.warnings} />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">{t("shop.printifyPublish.linked")}</p>
          <p className="text-emerald-800 dark:text-emerald-300">{t("shop.printifyPublish.linkedHint")}</p>
        </div>
      </div>
      <Warnings items={product.warnings} />

      {product.mediaAttached > 0 || (attachRequested && !syncMutation.isPending) ? (
        <p className="text-ink-700 text-sm">{t("shop.printifyPublish.mediaAttached", { count: product.mediaAttached })}</p>
      ) : !draft.etsyConnected ? (
        <p className="text-ink-600 text-sm">{t("shop.printifyPublish.connectEtsy")}</p>
      ) : draft.mockups.length > 0 && (
        <section className="space-y-2">
          <Label>{t("shop.printifyPublish.addMockups")} <span className="text-ink-500 font-normal">({t("shop.printifyPublish.selectedFirst", { count: mockupIds.length })})</span></Label>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {draft.mockups.map((mockup) => {
              const order = mockupIds.indexOf(mockup.id);
              return (
                <button key={mockup.id} type="button" onClick={() => toggle(mockup.id)} aria-pressed={order >= 0}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${order >= 0 ? "border-emerald-600" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mockup.previewUrl} alt="" className="size-full object-cover" />
                  {order >= 0 && <span className="absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">{order + 1}</span>}
                </button>
              );
            })}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={attach} disabled={syncMutation.isPending || mockupIds.length === 0}>
            {syncMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}{syncMutation.isPending ? t("shop.printifyPublish.adding") : t("shop.printifyPublish.addToListing")}
          </Button>
        </section>
      )}
      {syncMutation.isError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{getErrorMessage(syncMutation.error)}</p>}

      <DialogFooter>
        {product.etsyUrl && (
          <Button asChild className="bg-[#F1641E] text-white hover:bg-[#d9561a]">
            <a href={product.etsyUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{t("shop.printifyPublish.openListing")}</a>
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

/**
 * Printify's product types, searched by the words typed (brand and model included, e.g. "gildan 64000"). An admin
 * page passes its own `search` (the server's token) and `queryKey`; a seller's searches with their own key.
 */
export function BlueprintPicker({
  value,
  onChange,
  search = searchPrintifyBlueprints,
  queryKey = "printify-blueprints",
}: {
  value: Pick<PrintifyBlueprint, "id" | "title"> | null;
  onChange: (value: PrintifyBlueprint) => void;
  search?: (query: string) => Promise<PrintifyBlueprint[]>;
  queryKey?: string;
}) {
  const { t } = useTranslation("common");
  const [editing, setEditing] = useState(!value);
  const [query, setQuery] = useState("unisex softstyle");
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results = useQuery({ queryKey: [queryKey, debounced], queryFn: () => search(debounced), enabled: editing, staleTime: 60 * 60_000 });

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="printify-blueprint">{t("shop.printifyPublish.productType")}</Label>
      {value && !editing ? (
        <div className="border-ink-200 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="text-ink-800 truncate">{value.title}</span>
          <button type="button" className="shrink-0 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300" onClick={() => setEditing(true)}>{t("shop.etsyPublish.change")}</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="text-ink-400 absolute top-2.5 left-2.5 size-4" />
            <Input id="printify-blueprint" className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("shop.printifyPublish.blueprintPlaceholder")} />
          </div>
          {results.isFetching && <p className="text-ink-500 text-xs">{t("shop.etsyPublish.searching")}</p>}
          {results.isError && <p className="text-xs text-rose-700 dark:text-rose-300">{getErrorMessage(results.error)}</p>}
          {results.data && (
            <ul className="border-ink-200 max-h-48 overflow-y-auto rounded-md border text-sm">
              {results.data.length === 0 && <li className="text-ink-500 px-3 py-2">{t("shop.printifyPublish.nothingMatches")}</li>}
              {results.data.map((item) => (
                <li key={item.id}>
                  <button type="button" className="hover:bg-ink-50 flex w-full items-center gap-2 px-3 py-1.5 text-left" onClick={() => { onChange(item); setEditing(false); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-8 shrink-0 rounded object-cover" /> : <span className="bg-ink-100 size-8 shrink-0 rounded" />}
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="text-ink-400 shrink-0 text-xs">{item.brand} {item.model}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function ChipGroup({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} <span className="text-ink-500 font-normal">({selected.length}/{options.length})</span></Label>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-ink-200 text-ink-600 hover:border-ink-300"}`}>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-disc space-y-0.5 rounded-md border border-amber-200 bg-amber-50 py-2 pr-3 pl-7 text-left text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
