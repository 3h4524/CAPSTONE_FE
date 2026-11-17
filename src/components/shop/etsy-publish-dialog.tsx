"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Search, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type EtsyDraft, getEtsyDraft, publishEtsyDraft, type PublishEtsyDraftResult, searchEtsyTaxonomy, type ShopDesign } from "@/api/shop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/helpers/error-message";
import { useMutation, useQuery } from "@tanstack/react-query";

const MAX_TITLE = 140;
const MAX_TAGS = 13;
const MAX_TAG_LENGTH = 20;

const whenMadeOptions: [string, string | null][] = [
  ["made_to_order", "madeToOrder"], ["2020_2026", null], ["2010_2019", null], ["2007_2009", null], ["before_2007", "before2007"],
];
const whoMadeOptions: [string, string][] = [["i_did", "iDid"], ["collective", "collective"], ["someone_else", "someoneElse"]];

const selectClass = "h-9 w-full rounded-md border border-ink-200 bg-card px-2 text-sm text-ink-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none";

/** Sends one product to the seller's Etsy shop as a draft listing, from a form filled with its content and last settings. */
export function EtsyPublishDialog({ productId, open, onOpenChange }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("common");
  const draftQuery = useQuery({ queryKey: ["etsy-draft", productId], queryFn: () => getEtsyDraft(productId), enabled: open, staleTime: 0 });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("shop.etsyPublish.title")}</DialogTitle>
          <DialogDescription>{t("shop.etsyPublish.description")}</DialogDescription>
        </DialogHeader>
        {draftQuery.isPending ? (
          <p className="text-ink-500 flex items-center gap-2 py-10 text-sm"><Loader2 className="size-4 animate-spin" />{t("shop.etsyPublish.preparing")}</p>
        ) : draftQuery.isError || !draftQuery.data ? (
          <p className="py-6 text-sm text-rose-700 dark:text-rose-300">{getErrorMessage(draftQuery.error) || t("shop.etsyPublish.loadError")}</p>
        ) : draftQuery.data.connectionStatus !== "connected" ? (
          <NotConnected status={draftQuery.data.connectionStatus} />
        ) : (
          <PublishForm key={draftQuery.dataUpdatedAt} draft={draftQuery.data} productId={productId} onDone={() => draftQuery.refetch()} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotConnected({ status }: { status: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="text-ink-700 space-y-3 py-4 text-sm">
      <p>{status === "unavailable" ? t("shop.etsyPublish.unavailable") : status === "reconnect_required" ? t("shop.etsyPublish.reconnect") : t("shop.etsyPublish.connectFirst")}</p>
      {status !== "unavailable" && <Button asChild size="sm"><Link href="/shop"><Store className="size-4" />{t("shop.etsyPublish.goToShop")}</Link></Button>}
    </div>
  );
}

function PublishForm({ draft, productId, onDone }: { draft: EtsyDraft; productId: string; onDone: () => void }) {
  const { t, i18n } = useTranslation("common");
  const defaults = draft.defaults;
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [price, setPrice] = useState(defaults.price != null ? String(defaults.price) : "");
  const [quantity, setQuantity] = useState(String(defaults.quantity));
  const [type, setType] = useState(defaults.type);
  const [whoMade, setWhoMade] = useState(defaults.whoMade);
  const [whenMade, setWhenMade] = useState(defaults.whenMade);
  const [taxonomy, setTaxonomy] = useState<{ id: number; path: string } | null>(defaults.taxonomyId && defaults.taxonomyPath ? { id: defaults.taxonomyId, path: defaults.taxonomyPath } : null);
  // A remembered profile that no longer exists on the shop falls back to the first one.
  const [shippingProfileId, setShippingProfileId] = useState<number | null>(
    draft.shippingProfiles.some((option) => option.id === defaults.shippingProfileId) ? defaults.shippingProfileId : draft.shippingProfiles[0]?.id ?? null);
  const [readinessStateId, setReadinessStateId] = useState<number | null>(
    draft.processingProfiles.some((option) => option.id === defaults.readinessStateId) ? defaults.readinessStateId : null);
  const [partnerIds, setPartnerIds] = useState<number[]>(defaults.productionPartnerIds.filter((id) => draft.productionPartners.some((option) => option.id === id)));
  const [mockupIds, setMockupIds] = useState<string[]>(draft.mockups.slice(0, 10).map((mockup) => mockup.id));
  const [includeVideo, setIncludeVideo] = useState(Boolean(draft.video));
  // A digital listing delivers the final design by default; the seller can add up to five.
  const [designIds, setDesignIds] = useState<string[]>(draft.designs.slice(0, 1).map((design) => design.id));
  const [result, setResult] = useState<PublishEtsyDraftResult | null>(null);

  const tags = useMemo(() => tagText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagText]);
  const tagProblems = [
    tags.length > MAX_TAGS && t("shop.etsyPublish.problems.tooManyTags", { max: MAX_TAGS, count: tags.length }),
    tags.some((tag) => tag.length > MAX_TAG_LENGTH) && t("shop.etsyPublish.problems.tagTooLong", { max: MAX_TAG_LENGTH }),
  ].filter(Boolean) as string[];
  const priceValue = Number(price);
  const quantityValue = Number(quantity);
  const problems = [
    !title.trim() && t("shop.etsyPublish.problems.title"),
    !description.trim() && t("shop.etsyPublish.problems.description"),
    !(priceValue > 0) && t("shop.etsyPublish.problems.price"),
    !(quantityValue >= 1 && quantityValue <= 999) && t("shop.etsyPublish.problems.quantity"),
    !taxonomy && t("shop.etsyPublish.problems.category"),
    type === "physical" && !shippingProfileId && t("shop.etsyPublish.problems.shipping"),
    mockupIds.length === 0 && t("shop.etsyPublish.problems.image"),
    type === "download" && designIds.length === 0 && t("shop.etsyPublish.problems.designFile"),
    ...tagProblems,
  ].filter(Boolean) as string[];

  const publishMutation = useMutation({
    mutationFn: () => publishEtsyDraft(productId, {
      title: title.trim(), description: description.trim(), tags, price: priceValue, quantity: quantityValue,
      taxonomyId: taxonomy!.id, taxonomyPath: taxonomy!.path, type, whoMade, whenMade,
      shippingProfileId: type === "physical" ? shippingProfileId : null, readinessStateId: type === "physical" ? readinessStateId : null,
      productionPartnerIds: partnerIds, mockupIds, includeVideo,
      designIds: type === "download" ? designIds : [],
    }),
    onSuccess: (published) => { setResult(published); onDone(); },
  });

  if (result) return <Published result={result} />;

  const toggleMockup = (id: string) => setMockupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 20 ? current : [...current, id]);

  return (
    <div className="space-y-5">
      {draft.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-md border border-amber-200 bg-amber-50 py-2 pr-3 pl-7 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      {draft.history[0] && (
        <p className="text-ink-500 text-xs">
          {t("shop.etsyPublish.lastPush", { date: new Date(draft.history[0].attemptedAtUtc).toLocaleString(i18n.language) })}: {t(`shop.etsyPublish.historyStatuses.${draft.history[0].status}`, { defaultValue: draft.history[0].status })}
          {draft.history[0].editUrl && <> · <a className="underline" href={draft.history[0].editUrl} target="_blank" rel="noreferrer">{t("shop.etsyPublish.openDraft")}</a></>}
          {draft.history[0].error && ` · ${draft.history[0].error}`}
        </p>
      )}

      <section className="space-y-2">
        <Label>{t("shop.etsyPublish.images")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.imagesHint", { count: mockupIds.length })})</span></Label>
        {draft.mockups.some((mockup) => mockup.aiMade) && (
          <p className="text-ink-500 text-xs">
            {t("shop.etsyPublish.aiPhotos")}
          </p>
        )}
        {draft.mockups.length === 0 ? (
          <p className="text-ink-500 text-sm">{t("shop.etsyPublish.noMockups")}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {draft.mockups.map((mockup) => {
              const order = mockupIds.indexOf(mockup.id);
              return (
                <button key={mockup.id} type="button" onClick={() => toggleMockup(mockup.id)} aria-pressed={order >= 0}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${order >= 0 ? "border-blue-600" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  {/* Signed storage URL; next/image would need the media host whitelisted. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mockup.previewUrl} alt="" className="size-full object-cover" />
                  {order >= 0 && <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">{order + 1}</span>}
                  {mockup.aiMade && <span className="absolute right-1 bottom-1 rounded bg-slate-900/75 px-1 text-[10px] font-semibold text-white" title={t("shop.etsyPublish.madeWithAi")}>AI</span>}
                </button>
              );
            })}
          </div>
        )}
        {draft.video && (
          <label className="text-ink-700 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeVideo} onChange={(event) => setIncludeVideo(event.target.checked)} />
            {t("shop.etsyPublish.attachVideo", { seconds: draft.video.durationSeconds })}
          </label>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="etsy-title">{t("shop.etsyPublish.fields.title")}</Label><span className={`text-xs ${title.length > MAX_TITLE ? "text-rose-600 dark:text-rose-400" : "text-ink-400"}`}>{title.length}/{MAX_TITLE}</span></div>
          <Input id="etsy-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etsy-description">{t("shop.etsyPublish.fields.description")}</Label>
          <Textarea id="etsy-description" rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><Label htmlFor="etsy-tags">{t("shop.etsyPublish.fields.tags")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.fields.commaSeparated")})</span></Label><span className={`text-xs ${tags.length > MAX_TAGS ? "text-rose-600 dark:text-rose-400" : "text-ink-400"}`}>{tags.length}/{MAX_TAGS}</span></div>
          <Input id="etsy-tags" value={tagText} onChange={(event) => setTagText(event.target.value)} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="etsy-price">{t("shop.etsyPublish.fields.price")}{draft.currency ? ` (${draft.currency})` : ""}</Label>
          <Input id="etsy-price" type="number" min="0.2" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="24.99" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etsy-quantity">{t("shop.etsyPublish.fields.quantity")}</Label>
          <Input id="etsy-quantity" type="number" min="1" max="999" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <TaxonomyPicker value={taxonomy} onChange={setTaxonomy} initialQuery={draft.productName} />
        <div className="space-y-1.5">
          <Label>{t("shop.etsyPublish.fields.type")}</Label>
          <div className="text-ink-700 flex gap-4 pt-1.5 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="etsy-type" checked={type === "physical"} onChange={() => setType("physical")} />{t("shop.etsyPublish.physicalItem")}</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="etsy-type" checked={type === "download"} onChange={() => setType("download")} />{t("shop.etsyPublish.digitalDownload")}</label>
          </div>
          {type === "physical" && (
            <p className="text-ink-500 text-xs">{t("shop.etsyPublish.physicalHint")}</p>
          )}
        </div>
        {type === "download" && <DesignFiles designs={draft.designs} selected={designIds} onChange={setDesignIds} />}
        <div className="space-y-1.5">
          <Label htmlFor="etsy-who">{t("shop.etsyPublish.fields.whoMade")}</Label>
          <select id="etsy-who" className={selectClass} value={whoMade} onChange={(event) => setWhoMade(event.target.value as typeof whoMade)}>
            {whoMadeOptions.map(([value, labelKey]) => <option key={value} value={value}>{t(`shop.etsyPublish.whoMade.${labelKey}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etsy-when">{t("shop.etsyPublish.fields.whenMade")}</Label>
          <select id="etsy-when" className={selectClass} value={whenMade} onChange={(event) => setWhenMade(event.target.value)}>
            {whenMadeOptions.map(([value, labelKey]) => <option key={value} value={value}>{labelKey ? t(`shop.etsyPublish.whenMade.${labelKey}`) : value.replace("_", "–")}</option>)}
          </select>
        </div>
        {type === "physical" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="etsy-shipping">{t("shop.etsyPublish.fields.shippingProfile")}</Label>
              {draft.shippingProfiles.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">{t("shop.etsyPublish.noShipping")} <a className="underline" href="https://www.etsy.com/your/shops/me/tools/shipping-profiles" target="_blank" rel="noreferrer">{t("shop.etsyPublish.createOnEtsy")}</a>{t("shop.etsyPublish.thenReopen")}</p>
              ) : (
                <select id="etsy-shipping" className={selectClass} value={shippingProfileId ?? ""} onChange={(event) => setShippingProfileId(Number(event.target.value) || null)}>
                  {draft.shippingProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="etsy-processing">{t("shop.etsyPublish.fields.processingProfile")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.fields.optional")})</span></Label>
              <select id="etsy-processing" className={selectClass} value={readinessStateId ?? ""} onChange={(event) => setReadinessStateId(Number(event.target.value) || null)}>
                <option value="">{t("shop.etsyPublish.shopDefault")}</option>
                {draft.processingProfiles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
          </>
        )}
        {draft.productionPartners.length > 0 && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("shop.etsyPublish.fields.productionPartners")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.fields.productionPartnersHint")})</span></Label>
            <div className="text-ink-700 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {draft.productionPartners.map((partner) => (
                <label key={partner.id} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={partnerIds.includes(partner.id)} onChange={(event) => setPartnerIds((current) => event.target.checked ? [...current, partner.id] : current.filter((id) => id !== partner.id))} />
                  {partner.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {publishMutation.isError && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{getErrorMessage(publishMutation.error)}</p>}

      <DialogFooter className="items-center gap-3 sm:justify-between">
        <p className="text-ink-500 text-xs">{problems[0] ?? t("shop.etsyPublish.sendsTo", { shop: draft.shopName ?? t("shop.etsyPublish.yourShop") })}</p>
        <Button type="button" onClick={() => publishMutation.mutate()} disabled={problems.length > 0 || publishMutation.isPending}>
          {publishMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {publishMutation.isPending ? t("shop.etsyPublish.sending") : t("shop.etsyPublish.createDraft")}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Searches Etsy's categories by the words typed; the most specific matches come first. */
export function TaxonomyPicker({ value, onChange, initialQuery }: { value: { id: number; path: string } | null; onChange: (value: { id: number; path: string }) => void; initialQuery: string }) {
  const { t } = useTranslation("common");
  const [query, setQuery] = useState(value ? "" : initialQuery.split(/\s+/).slice(-2).join(" "));
  const [debounced, setDebounced] = useState(query);
  const [editing, setEditing] = useState(!value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results = useQuery({ queryKey: ["etsy-taxonomy", debounced], queryFn: () => searchEtsyTaxonomy(debounced), enabled: editing && debounced.length >= 2, staleTime: 60 * 60_000 });

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor="etsy-category">{t("shop.etsyPublish.fields.category")}</Label>
      {value && !editing ? (
        <div className="border-ink-200 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="text-ink-800 truncate" title={value.path}>{value.path}</span>
          <button type="button" className="shrink-0 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300" onClick={() => setEditing(true)}>{t("shop.etsyPublish.change")}</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="text-ink-400 absolute top-2.5 left-2.5 size-4" />
            <Input id="etsy-category" className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("shop.etsyPublish.categoryPlaceholder")} />
          </div>
          {results.isFetching && <p className="text-ink-500 text-xs">{t("shop.etsyPublish.searching")}</p>}
          {results.data && (
            <ul className="border-ink-200 max-h-44 overflow-y-auto rounded-md border text-sm">
              {results.data.length === 0 && <li className="text-ink-500 px-3 py-2">{t("shop.etsyPublish.noCategory")}</li>}
              {results.data.map((item) => (
                <li key={item.id}>
                  <button type="button" className="hover:bg-ink-50 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left" onClick={() => { onChange(item); setEditing(false); }}>
                    <span className="truncate" title={item.path}>{item.path}</span>
                    {value?.id === item.id && <Check className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />}
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

const MAX_FILES = 5;

/** The design files a buyer of a digital listing downloads after paying (Etsy allows five, 20 MB each). */
function DesignFiles({ designs, selected, onChange }: { designs: ShopDesign[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation("common");
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : selected.length >= MAX_FILES ? selected : [...selected, id]);
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label>{t("shop.etsyPublish.files")} <span className="text-ink-500 font-normal">({t("shop.etsyPublish.filesSelected", { selected: selected.length, max: MAX_FILES })})</span></Label>
      {designs.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t("shop.etsyPublish.noDesign")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {designs.map((design) => {
            const chosen = selected.includes(design.id);
            return (
              <button key={design.id} type="button" onClick={() => toggle(design.id)} aria-pressed={chosen}
                className={`overflow-hidden rounded-md border-2 text-left ${chosen ? "border-blue-600" : "border-transparent opacity-60 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={design.previewUrl} alt="" className="aspect-square w-full bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
                <span className="text-ink-600 block px-1.5 py-1 text-[11px]">
                  {design.width}×{design.height} · {design.fileFormat.toUpperCase()} · {design.fileSizeMb.toFixed(1)} MB{design.isFinal ? ` · ${t("shop.etsyPublish.final")}` : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-ink-500 text-xs">{t("shop.etsyPublish.filesHint")}</p>
    </div>
  );
}

function Published({ result }: { result: PublishEtsyDraftResult }) {
  const { t } = useTranslation("common");
  return (
    <div className="text-ink-700 space-y-3 py-2 text-sm">
      <p className="text-ink-900 font-medium">
        {result.alreadyPublished ? t("shop.etsyPublish.alreadySent") : t("shop.etsyPublish.draftCreated")}
      </p>
      {!result.alreadyPublished && (
        <p>
          {result.videoUploaded
            ? t("shop.etsyPublish.uploadedWithVideo", { count: result.imagesUploaded })
            : t("shop.etsyPublish.uploaded", { count: result.imagesUploaded })}
          {result.filesUploaded > 0 && `; ${t("shop.etsyPublish.filesAttached", { count: result.filesUploaded })}`}.
        </p>
      )}
      {result.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-amber-800 dark:text-amber-300">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      )}
      <p className="text-ink-500">{t("shop.etsyPublish.reviewOnEtsy")}</p>
      <Button asChild><a href={result.editUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />{t("shop.etsyPublish.openOnEtsy")}</a></Button>
    </div>
  );
}
