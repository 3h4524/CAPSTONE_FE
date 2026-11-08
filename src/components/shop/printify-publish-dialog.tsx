"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ExternalLink, KeyRound, Loader2, Printer, Search } from "lucide-react";

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
const notReady = {
  not_connected: "Add your Printify API key on the API Keys page first.",
  key_invalid: "Your Printify API key is disabled, expired or was refused. Check or replace it on the API Keys page.",
  no_store: "Your Printify account has no store. On Printify, add a store linked to your Etsy shop, then try again.",
  unavailable: "Printify is not answering right now. Try again in a moment.",
};

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
  const draftQuery = useQuery({ queryKey: ["printify-draft", productId], queryFn: () => getPrintifyDraft(productId), enabled: open, staleTime: 0 });
  const [product, setProduct] = useState<PrintifyProduct | null>(null);
  const draft = draftQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Printer className="size-5 text-emerald-600 dark:text-emerald-400" />Push to Printify</DialogTitle>
          <DialogDescription>Printify prints and ships each order. It publishes this product to your Etsy shop, linked so orders reach it automatically.</DialogDescription>
        </DialogHeader>
        <Steps current={!product ? 1 : product.state === "created" ? 2 : 3} />
        {draftQuery.isPending ? (
          <p className="flex items-center gap-2 py-10 text-sm text-ink-500"><Loader2 className="size-4 animate-spin" />Preparing…</p>
        ) : draftQuery.isError || !draft ? (
          <p className="py-6 text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(draftQuery.error) || "The product could not be loaded."}</p>
        ) : draft.connection.status !== "connected" ? (
          <div className="space-y-3 py-4 text-sm text-ink-700">
            <p>{notReady[draft.connection.status as keyof typeof notReady] ?? notReady.not_connected}</p>
            {draft.connection.status !== "unavailable" && draft.connection.status !== "no_store" && (
              <Button asChild size="sm"><Link href="/api-keys"><KeyRound className="size-4" />Open API Keys</Link></Button>
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
  const steps = ["Create on Printify", "Set prices", "Publish to Etsy"];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((label, index) => (
        <li key={label} className={`flex items-center gap-1.5 ${index + 1 === current ? "font-semibold text-ink-900" : index + 1 < current ? "text-emerald-700 dark:text-emerald-300" : "text-ink-400"}`}>
          <span className={`flex size-5 items-center justify-center rounded-full text-[11px] ${index + 1 < current ? "bg-emerald-600 text-white" : index + 1 === current ? "bg-ink-900 text-card" : "bg-ink-200 text-ink-500"}`}>
            {index + 1 < current ? <Check className="size-3" /> : index + 1}
          </span>
          {label}
          {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-ink-200" />}
        </li>
      ))}
    </ol>
  );
}

function CreateStep({ draft, productId, onCreated }: { draft: PrintifyDraft; productId: string; onCreated: (product: PrintifyProduct) => void }) {
  const defaults = draft.defaults;
  const [designId, setDesignId] = useState(draft.designs[0]?.id ?? null);
  const [blueprint, setBlueprint] = useState<Pick<PrintifyBlueprint, "id" | "title"> | null>(
    defaults.blueprintId ? { id: defaults.blueprintId, title: defaults.blueprintTitle ?? `Product ${defaults.blueprintId}` } : null);
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
    !designId && "Approve a design first.",
    !blueprint && "Choose a product type.",
    !providerId && "Choose a print provider.",
    variantIds.length === 0 && "Choose at least one color and size.",
    variantIds.length > MAX_VARIANTS && `Etsy allows ${MAX_VARIANTS} variants; you chose ${variantIds.length}.`,
    !title.trim() && "Add a title.",
    !description.trim() && "Add a description.",
    tags.length > MAX_TAGS && `Etsy allows ${MAX_TAGS} tags.`,
    !(priceValue >= 1) && "Set a starting price.",
  ].filter(Boolean) as string[];

  const createMutation = useMutation({
    mutationFn: () => createPrintifyProduct(productId, {
      designId: designId!, blueprintId: blueprint!.id, blueprintTitle: blueprint!.title, printProviderId: providerId!,
      printProviderTitle: provider?.title ?? null, variantIds, title: title.trim(), description: description.trim(), tags, price: priceValue,
    }),
    onSuccess: onCreated,
  });
  const resumeMutation = useMutation({
    mutationFn: () => syncPrintifyProduct(productId, resumable!.printifyProductId!, { mockupIds: [], includeVideo: false }),
    onSuccess: onCreated,
  });

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <div className="space-y-5">
      <Warnings items={draft.warnings} />
      {resumable && (
        <div className="flex flex-col gap-2 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Last sent {new Date(resumable.attemptedAtUtc).toLocaleString()} · {resumable.state}
            {resumable.etsyUrl && <> · <a className="underline" href={resumable.etsyUrl} target="_blank" rel="noreferrer">Etsy listing</a></>}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
            {resumeMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}Continue with that product
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <Label>Design to print</Label>
        {draft.designs.length === 0 ? <p className="text-sm text-ink-500">No approved design.</p> : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {draft.designs.map((design) => (
              <button key={design.id} type="button" onClick={() => setDesignId(design.id)} aria-pressed={designId === design.id}
                className={`relative overflow-hidden rounded-md border-2 ${designId === design.id ? "border-emerald-600" : "border-transparent opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.previewUrl} alt="" className="aspect-square w-full bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
                <span className="block px-1 py-0.5 text-[10px] text-ink-500">{design.width}×{design.height}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <BlueprintPicker value={blueprint} onChange={(next) => { setBlueprint(next); setProviderId(null); }} />
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="printify-provider">Print provider</Label>
          {providersQuery.isFetching ? <p className="text-xs text-ink-500">Loading providers…</p> : (
            <select id="printify-provider" className={selectClass} value={providerId ?? ""} disabled={!providersQuery.data?.length}
              onChange={(event) => setProviderId(Number(event.target.value) || null)}>
              {!providersQuery.data?.length && <option value="">Choose a product type first</option>}
              {providersQuery.data?.map((item) => (
                <option key={item.id} value={item.id}>{item.title}{item.country ? ` — ${item.country}` : ""}</option>
              ))}
            </select>
          )}
          <p className="text-xs text-ink-500">Providers in the United States are listed first: they reach US buyers fastest.</p>
        </div>
      </section>

      {catalog && (
        <section className="space-y-3">
          <ChipGroup label="Colors" options={catalog.colors} selected={colors} onToggle={(value) => toggle(colors, value, setColors)} />
          <ChipGroup label="Sizes" options={catalog.sizes} selected={sizes} onToggle={(value) => toggle(sizes, value, setSizes)} />
          <p className="text-xs text-ink-500">
            {variantIds.length} variant(s)
            {catalog.usShippingFirstItem != null && ` · US shipping charged to the buyer: ${money(catalog.usShippingFirstItem)} for one item${catalog.usShippingAdditionalItem != null ? `, ${money(catalog.usShippingAdditionalItem)} each extra` : ""}`}
          </p>
        </section>
      )}
      {catalogQuery.isError && <p className="text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(catalogQuery.error)}</p>}

      <section className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="printify-title">Title</Label><span className={`text-xs ${title.length > MAX_TITLE ? "text-rose-600 dark:text-rose-400" : "text-ink-400"}`}>{title.length}/{MAX_TITLE}</span></div>
          <Input id="printify-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="printify-description">Description</Label>
          <Textarea id="printify-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div className="space-y-1.5">
            <div className="flex justify-between"><Label htmlFor="printify-tags">Tags <span className="font-normal text-ink-500">(comma-separated)</span></Label><span className="text-xs text-ink-400">{tags.length}/{MAX_TAGS}</span></div>
            <Input id="printify-tags" value={tagText} onChange={(event) => setTagText(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="printify-price">Starting price (USD)</Label>
            <Input id="printify-price" type="number" min="1" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </div>
        </div>
      </section>

      {(createMutation.isError || resumeMutation.isError) && (
        <p className="rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-300">{getErrorMessage(createMutation.error ?? resumeMutation.error)}</p>
      )}
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-xs text-ink-500">{problems[0] ?? "Creates the product on Printify only. You set final prices next, with Printify's costs."}</p>
        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => createMutation.mutate()} disabled={problems.length > 0 || createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}{createMutation.isPending ? "Creating on Printify…" : "Create on Printify"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function PriceStep({ draft, product, onPublished }: { draft: PrintifyDraft; product: PrintifyProduct; onPublished: (product: PrintifyProduct) => void }) {
  const [prices, setPrices] = useState<Record<number, string>>(() => Object.fromEntries(product.variants.map((variant) => [variant.id, variant.price.toFixed(2)])));
  const [bulk, setBulk] = useState("");
  const shipping = product.usShippingFirstItem ?? 0;
  const rows = product.variants.map((variant) => {
    const price = Number(prices[variant.id]);
    return { variant, price, ...estimate(price, variant.cost, shipping) };
  });
  const problems = rows.filter((row) => !(row.price >= 1)).length > 0 ? ["Every variant needs a price."]
    : rows.some((row) => row.price < row.variant.cost) ? ["A price is below Printify's cost."] : [];
  const thin = rows.filter((row) => row.profit < 3).length;

  const publishMutation = useMutation({
    mutationFn: () => publishPrintifyProduct(product.productId, product.printifyProductId, rows.map((row) => ({ variantId: row.variant.id, price: row.price }))),
    onSuccess: onPublished,
  });

  return (
    <div className="space-y-4">
      <Warnings items={product.warnings} />
      {product.alreadyCreated && <p className="text-xs text-ink-500">This design was already sent with the same settings; continuing with that Printify product.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="printify-bulk" className="text-xs">Set every price to</Label>
          <Input id="printify-bulk" className="h-8 w-28" type="number" min="1" step="0.01" placeholder="24.99" value={bulk} onChange={(event) => setBulk(event.target.value)} />
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!(Number(bulk) >= 1)}
          onClick={() => setPrices(Object.fromEntries(product.variants.map((variant) => [variant.id, Number(bulk).toFixed(2)])))}>Apply</Button>
        <Button type="button" size="sm" variant="ghost"
          onClick={() => setPrices(Object.fromEntries(product.variants.map((variant) => [variant.id, (Math.ceil(variant.cost + 12) - 0.01).toFixed(2)])))}>
          Suggest (≈ $10 profit each)
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-ink-200">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-xs text-ink-500">
            <tr><th className="px-3 py-2 text-left font-medium">Variant</th><th className="px-3 py-2 text-right font-medium">Printify cost</th><th className="px-3 py-2 text-right font-medium">Your price</th><th className="px-3 py-2 text-right font-medium">Etsy fees*</th><th className="px-3 py-2 text-right font-medium">Profit*</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map(({ variant, price, fees, profit }) => (
              <tr key={variant.id}>
                <td className="px-3 py-1.5 text-ink-800">{variant.title}</td>
                <td className="px-3 py-1.5 text-right text-ink-600 tabular-nums">{money(variant.cost)}</td>
                <td className="px-3 py-1.5 text-right">
                  <Input className="ml-auto h-7 w-24 text-right" type="number" min="1" step="0.01" value={prices[variant.id]}
                    onChange={(event) => setPrices((current) => ({ ...current, [variant.id]: event.target.value }))} />
                </td>
                <td className="px-3 py-1.5 text-right text-ink-500 tabular-nums">{price >= 1 ? money(fees) : "—"}</td>
                <td className={`px-3 py-1.5 text-right font-medium tabular-nums ${profit < 0 ? "text-rose-600 dark:text-rose-400" : profit < 3 ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-300"}`}>{price >= 1 ? money(profit) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">
        * Estimated with Etsy&apos;s US fees on price plus {money(shipping)} shipping, which the buyer pays and Printify charges you. Currency conversion to your payout account may take about 2.5% more.
        {thin > 0 && <span className="text-amber-700 dark:text-amber-300"> {thin} variant(s) leave less than $3.</span>}
      </p>
      {publishMutation.isError && <p className="rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-300">{getErrorMessage(publishMutation.error)}</p>}
      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-xs text-ink-500">{problems[0] ?? `Printify publishes to ${draft.connection.shopTitle ?? "your store"} on Etsy. Whether it lands as active or draft follows your Printify store's publishing settings.`}</p>
        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => publishMutation.mutate()} disabled={problems.length > 0 || publishMutation.isPending}>
          {publishMutation.isPending && <Loader2 className="size-4 animate-spin" />}{publishMutation.isPending ? "Asking Printify…" : "Publish to Etsy"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function PublishStep({ draft, product, onChange }: { draft: PrintifyDraft; product: PrintifyProduct; onChange: (product: PrintifyProduct) => void }) {
  const [mockupIds, setMockupIds] = useState<string[]>(draft.mockups.slice(0, 5).map((mockup) => mockup.id));
  const [includeVideo, setIncludeVideo] = useState(Boolean(draft.video));
  const [attachRequested, setAttachRequested] = useState(false);
  const published = product.state === "published";

  // While Printify publishes in the background, ask again every few seconds.
  const syncMutation = useMutation({
    mutationFn: (media: { mockupIds: string[]; includeVideo: boolean }) => syncPrintifyProduct(product.productId, product.printifyProductId, media),
    onSuccess: onChange,
  });
  useEffect(() => {
    if (product.state !== "publishing") return;
    const timer = window.setTimeout(() => syncMutation.mutate({ mockupIds: [], includeVideo: false }), POLL_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const attach = () => { setAttachRequested(true); syncMutation.mutate({ mockupIds, includeVideo }); };
  const toggle = (id: string) => setMockupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= MAX_ATTACHED ? current : [...current, id]);

  if (!published)
    return (
      <div className="space-y-3 py-6 text-center text-sm text-ink-600">
        <Loader2 className="mx-auto size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="font-medium text-ink-900">Printify is publishing to Etsy…</p>
        <p>This usually takes under a minute. You can close this window; publishing continues on Printify.</p>
        <Warnings items={product.warnings} />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">On Etsy, linked to Printify.</p>
          <p className="text-emerald-800 dark:text-emerald-300">New orders go to Printify automatically, which charges your Printify payment method and ships to the buyer.</p>
        </div>
      </div>
      <Warnings items={product.warnings} />

      {product.mediaAttached > 0 || (attachRequested && !syncMutation.isPending) ? (
        <p className="text-sm text-ink-700">{product.mediaAttached} APCS image(s)/video added to the listing, in front of Printify&apos;s mock-ups.</p>
      ) : !draft.etsyConnected ? (
        <p className="text-sm text-ink-600">Connect Etsy on the Shop page to add your APCS mock-ups and video to this listing.</p>
      ) : (draft.mockups.length > 0 || draft.video) && (
        <section className="space-y-2">
          <Label>Add your APCS mock-ups to the listing <span className="font-normal text-ink-500">({mockupIds.length} selected, shown first)</span></Label>
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
          {draft.video && (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={includeVideo} onChange={(event) => setIncludeVideo(event.target.checked)} />Add the approved video ({draft.video.durationSeconds}s)
            </label>
          )}
          <Button type="button" size="sm" variant="outline" onClick={attach} disabled={syncMutation.isPending || (mockupIds.length === 0 && !includeVideo)}>
            {syncMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}{syncMutation.isPending ? "Adding to Etsy…" : "Add to Etsy listing"}
          </Button>
        </section>
      )}
      {syncMutation.isError && <p className="rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-300">{getErrorMessage(syncMutation.error)}</p>}

      <DialogFooter>
        {product.etsyUrl && (
          <Button asChild className="bg-[#F1641E] text-white hover:bg-[#d9561a]">
            <a href={product.etsyUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Open the Etsy listing</a>
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

/** Printify's product types, searched by the words typed (brand and model included, e.g. "gildan 64000"). */
export function BlueprintPicker({ value, onChange }: { value: Pick<PrintifyBlueprint, "id" | "title"> | null; onChange: (value: Pick<PrintifyBlueprint, "id" | "title">) => void }) {
  const [editing, setEditing] = useState(!value);
  const [query, setQuery] = useState("unisex softstyle");
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results = useQuery({ queryKey: ["printify-blueprints", debounced], queryFn: () => searchPrintifyBlueprints(debounced), enabled: editing, staleTime: 60 * 60_000 });

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="printify-blueprint">Product type</Label>
      {value && !editing ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-ink-200 px-3 py-2 text-sm">
          <span className="truncate text-ink-800">{value.title}</span>
          <button type="button" className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline" onClick={() => setEditing(true)}>Change</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 size-4 text-ink-400" />
            <Input id="printify-blueprint" className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. gildan 64000, bella canvas 3001, mug 11oz" />
          </div>
          {results.isFetching && <p className="text-xs text-ink-500">Searching…</p>}
          {results.isError && <p className="text-xs text-rose-700 dark:text-rose-300">{getErrorMessage(results.error)}</p>}
          {results.data && (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-ink-200 text-sm">
              {results.data.length === 0 && <li className="px-3 py-2 text-ink-500">Nothing matches.</li>}
              {results.data.map((item) => (
                <li key={item.id}>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-ink-50" onClick={() => { onChange(item); setEditing(false); }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-8 shrink-0 rounded object-cover" /> : <span className="size-8 shrink-0 rounded bg-ink-100" />}
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    <span className="shrink-0 text-xs text-ink-400">{item.brand} {item.model}</span>
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
      <Label>{label} <span className="font-normal text-ink-500">({selected.length}/{options.length})</span></Label>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <button key={option} type="button" onClick={() => onToggle(option)} aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "border-ink-200 text-ink-600 hover:border-ink-300"}`}>
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
    <ul className="list-disc space-y-0.5 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 py-2 pr-3 pl-7 text-left text-xs text-amber-900 dark:text-amber-300">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
