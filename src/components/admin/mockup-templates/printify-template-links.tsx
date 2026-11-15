"use client";

import { useState } from "react";
import { AlertCircle, Link2, Loader2, TriangleAlert, Unlink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  type AdminMockupTemplate,
  adminMockupTemplateKeys,
  getAdminMockupTemplates,
  linkMockupTemplatePrintify,
  unlinkMockupTemplatePrintify,
} from "@/api/admin-mockup-templates";
import { getPrintifyCatalog, getPrintifyConnection, getPrintifyProviders, type PrintifyBlueprint } from "@/api/printify";
import { PageHeader } from "@/components/commons/layout/page-header";
import { BlueprintPicker, ChipGroup } from "@/components/shop/printify-publish-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/helpers/error-message";
import { productTypeLabel } from "@/helpers/mockup-template";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const NO_PROVIDER = "none";

/**
 * Admin: link each system mock-up template to the Printify product its photo shows. A workflow that pushes to Printify
 * offers only linked templates and makes the linked product, so a listing shows the garment that ships.
 */
export function PrintifyTemplateLinks() {
  const { t } = useTranslation("common");
  const templates = useQuery({ queryKey: adminMockupTemplateKeys.all, queryFn: getAdminMockupTemplates });
  const connection = useQuery({ queryKey: ["printify-connection-admin"], queryFn: () => getPrintifyConnection(), staleTime: 60_000 });
  const ready = connection.data?.status === "connected";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mock-up templates for Printify"
        description="Link each system template to the Printify product its photo shows. When a workflow pushes to Printify, sellers can only choose linked templates, and Printify makes the linked product, so the listing's mock-ups show the garment that ships. Compare the template with Printify's photo before linking."
      />
      {connection.data && !ready && (
        <Alert>
          <TriangleAlert />
          <AlertDescription>Searching Printify&apos;s products uses your own Printify API key. Add one on the API Keys page.</AlertDescription>
        </Alert>
      )}
      {templates.isPending && (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      )}
      {templates.isError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{t("adminUi.templatesLoadFailed")}</AlertTitle>
          <AlertDescription>{getErrorMessage(templates.error)}</AlertDescription>
        </Alert>
      )}
      <ul className="grid gap-4 lg:grid-cols-2">
        {templates.data?.map((template) => <TemplateLinkCard key={template.id} template={template} canSearch={ready} />)}
      </ul>
    </div>
  );
}

function TemplateLinkCard({ template, canSearch }: { template: AdminMockupTemplate; canSearch: boolean }) {
  const queryClient = useQueryClient();
  const link = template.printify;
  const [editing, setEditing] = useState(false);
  const [blueprint, setBlueprint] = useState<{ id: number; title: string; imageUrl: string | null } | null>(
    link ? { id: link.blueprintId, title: link.blueprintTitle, imageUrl: link.blueprintImageUrl } : null
  );
  const [providerId, setProviderId] = useState<number | null>(link?.printProviderId ?? null);
  const [sizes, setSizes] = useState<string[]>(link?.defaultSizes ?? []);
  const providers = useQuery({ queryKey: ["printify-providers", blueprint?.id], queryFn: () => getPrintifyProviders(blueprint!.id), enabled: editing && Boolean(blueprint), staleTime: 60 * 60_000 });
  const catalog = useQuery({ queryKey: ["printify-catalog", blueprint?.id, providerId], queryFn: () => getPrintifyCatalog(blueprint!.id, providerId!), enabled: editing && Boolean(blueprint && providerId), staleTime: 60 * 60_000 });

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminMockupTemplateKeys.all });
  const save = useMutation({
    mutationFn: () =>
      linkMockupTemplatePrintify({
        id: template.id,
        input: {
          blueprintId: blueprint!.id,
          blueprintTitle: blueprint!.title,
          blueprintImageUrl: blueprint!.imageUrl,
          printProviderId: providerId,
          printProviderTitle: providers.data?.find((item) => item.id === providerId)?.title ?? link?.printProviderTitle ?? null,
          defaultSizes: sizes,
        },
      }),
    onSuccess: async () => {
      toast.success(`${template.name} is linked to ${blueprint!.title}.`);
      setEditing(false);
      await refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => unlinkMockupTemplatePrintify(template.id),
    onSuccess: async () => {
      toast.success(`${template.name} is no longer offered for Printify.`);
      setBlueprint(null);
      setProviderId(null);
      setSizes([]);
      await refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const imageOf = (url: string | null | undefined, label: string) =>
    url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={label} className="border-ink-200 aspect-square w-full rounded-md border object-cover" />
    ) : (
      <div className="border-ink-200 text-ink-400 flex aspect-square w-full items-center justify-center rounded-md border border-dashed text-xs">No Printify product</div>
    );

  return (
    <li className="border-ink-200 bg-card space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-ink-900 font-medium">{template.name}</p>
          <p className="text-ink-500 text-xs">{productTypeLabel(template.productType)} · {template.kind}{template.isActive ? "" : " · inactive"}</p>
        </div>
        {link ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"><Link2 className="size-3" />Linked</span>
        ) : (
          <span className="bg-ink-100 text-ink-600 rounded-full px-2 py-0.5 text-xs">Etsy only</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-ink-500 text-xs">Template</p>
          {imageOf(template.previewImageUrl ?? template.baseImageUrl, template.name)}
        </div>
        <div className="space-y-1">
          <p className="text-ink-500 text-xs">Printify product</p>
          {imageOf(blueprint?.imageUrl, blueprint?.title ?? "Printify product")}
        </div>
      </div>
      {link && !editing && (
        <p className="text-ink-700 text-sm">
          {link.blueprintTitle} · {link.printProviderTitle ?? "no default provider"}
          {link.defaultSizes.length > 0 ? ` · ${link.defaultSizes.join(", ")}` : ""}
        </p>
      )}
      {editing ? (
        <div className="space-y-3">
          <BlueprintPicker
            value={blueprint}
            onChange={(next) => {
              setBlueprint({ id: next.id, title: next.title, imageUrl: (next as PrintifyBlueprint).imageUrl ?? null });
              setProviderId(null);
              setSizes([]);
            }}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${template.id}-provider`}>Default print provider</Label>
            <Select
              value={providerId ? String(providerId) : NO_PROVIDER}
              disabled={!providers.data?.length}
              onValueChange={(value) => { setProviderId(value === NO_PROVIDER ? null : Number(value)); setSizes([]); }}
            >
              <SelectTrigger id={`${template.id}-provider`} className="w-full">
                <SelectValue placeholder={providers.isFetching ? "Loading providers…" : "None (the seller chooses)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROVIDER}>{providers.isFetching ? "Loading providers…" : "None (the seller chooses)"}</SelectItem>
                {providers.data?.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}{item.country ? ` — ${item.country}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {catalog.data && (
            <ChipGroup label="Default sizes" options={catalog.data.sizes} selected={sizes}
              onToggle={(value) => setSizes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))} />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="button" size="sm" disabled={!blueprint || save.isPending} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="size-3.5 animate-spin" />}Save link
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          {link && (
            <Button type="button" variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Unlink className="size-3.5" />Unlink
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={!canSearch} onClick={() => setEditing(true)}>
            <Link2 className="size-3.5" />{link ? "Change" : "Link to Printify"}
          </Button>
        </div>
      )}
    </li>
  );
}
