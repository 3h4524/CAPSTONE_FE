"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { adminPrintifyKeys, getAdminPrintifyCatalog, getAdminPrintifyProviders, searchAdminPrintifyBlueprints } from "@/api/admin-mockup-printify";
import { linkMockupTemplatePrintify } from "@/api/admin-mockup-templates";
import { mockupTemplateKeys } from "@/api/mockup-templates";
import type { PrintifyBlueprint } from "@/api/printify";
import { BlueprintPicker, ChipGroup } from "@/components/shop/printify-publish-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import type { MockupTemplate } from "@/types/mockup-templates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL"];

type PrintifyLinkDialogProps = {
  /** A shared template made from an uploaded photo; null closes the dialog. */
  template: MockupTemplate | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Links an uploaded shared template to the Printify product its photo shows, by hand. Its photo and print area stay
 * the uploaded ones, so they only match Printify as well as the admin compared them; "Create from Printify" measures
 * them instead.
 */
export const PrintifyLinkDialog = ({ template, onOpenChange }: PrintifyLinkDialogProps) => {
  const { t } = useTranslation("common");
  return (
    <Dialog open={template !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-3.5 pr-12 text-left">
          <DialogTitle>{t("admin.mockups.linkDialog.title", { name: template?.name })}</DialogTitle>
          <DialogDescription>{t("admin.mockups.linkDialog.description")}</DialogDescription>
        </DialogHeader>
        {template && <LinkForm key={template.id} template={template} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
};

const LinkForm = ({ template, onDone }: { template: MockupTemplate; onDone: () => void }) => {
  const { t } = useTranslation("common");
  const queryClient = useQueryClient();
  const [blueprint, setBlueprint] = useState<PrintifyBlueprint | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  // Null until the admin changes them: the usual sizes the provider makes.
  const [sizes, setSizes] = useState<string[] | null>(null);
  const providers = useQuery({
    queryKey: adminPrintifyKeys.providers(blueprint?.id ?? 0),
    queryFn: () => getAdminPrintifyProviders(blueprint!.id),
    enabled: blueprint !== null,
    staleTime: 60 * 60_000,
  });
  const catalog = useQuery({
    queryKey: adminPrintifyKeys.catalog(blueprint?.id ?? 0, providerId ?? 0),
    queryFn: () => getAdminPrintifyCatalog(blueprint!.id, providerId!),
    enabled: blueprint !== null && providerId !== null,
    staleTime: 60 * 60_000,
  });
  const provider = providers.data?.find((item) => item.id === providerId) ?? null;
  const chosenSizes = sizes ?? (catalog.data?.sizes ?? []).filter((size) => DEFAULT_SIZES.includes(size));

  const save = useMutation({
    mutationFn: () =>
      linkMockupTemplatePrintify({
        id: template.id,
        input: {
          blueprintId: blueprint!.id,
          blueprintTitle: blueprint!.title,
          blueprintImageUrl: blueprint!.imageUrl,
          printProviderId: providerId,
          printProviderTitle: provider?.title ?? null,
          defaultSizes: chosenSizes,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mockupTemplateKeys.all });
      showToast("success", t("admin.mockups.shared.linkedToast", { name: template.name, blueprint: blueprint!.title }));
      onDone();
    },
  });

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <figure className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- the template photo on the image CDN, shown as is */}
            <img src={template.previewImageUrl ?? template.baseImageUrl} alt="" className="bg-ink-100 aspect-square w-full rounded-md object-contain" />
            <figcaption className="text-muted-foreground text-xs">{t("admin.mockups.linkDialog.thisTemplate")}</figcaption>
          </figure>
          <figure className="space-y-1">
            {blueprint?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Printify's product photo, shown as is
              <img src={blueprint.imageUrl} alt="" className="bg-ink-100 aspect-square w-full rounded-md object-contain" />
            ) : (
              <div className="border-ink-200 text-ink-400 flex aspect-square w-full items-center justify-center rounded-md border border-dashed text-xs">
                {t("admin.mockups.linkDialog.noPrintifyYet")}
              </div>
            )}
            <figcaption className="text-muted-foreground text-xs">{t("admin.mockups.linkDialog.printifyProduct")}</figcaption>
          </figure>
        </div>
        <BlueprintPicker
          value={blueprint}
          onChange={(next) => {
            setBlueprint(next);
            setProviderId(null);
            setSizes(null);
          }}
          search={searchAdminPrintifyBlueprints}
          queryKey="admin-printify-blueprints"
        />
        {blueprint && (
          <div className="space-y-1.5">
            <Label htmlFor="printify-link-provider">{t("admin.mockups.shared.printProvider")}</Label>
            <Select
              value={providerId ? String(providerId) : ""}
              onValueChange={(value) => {
                if (!value) return;
                setProviderId(Number(value));
                setSizes(null);
              }}
            >
              <SelectTrigger id="printify-link-provider" className="w-full">
                <SelectValue placeholder={providers.isFetching ? t("admin.mockups.shared.loadingProviders") : t("admin.mockups.shared.chooseProvider")} />
              </SelectTrigger>
              <SelectContent>
                {(providers.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.title}
                    {item.country ? ` · ${item.country}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {catalog.data && (
          <ChipGroup
            label={t("admin.mockups.shared.defaultSizes")}
            options={catalog.data.sizes}
            selected={chosenSizes}
            onToggle={(size) => setSizes(chosenSizes.includes(size) ? chosenSizes.filter((item) => item !== size) : [...chosenSizes, size])}
          />
        )}
        {(providers.isError || catalog.isError || save.isError) && (
          <p role="alert" className="text-sm text-red-600">
            {getErrorMessage(save.error ?? catalog.error ?? providers.error)}
          </p>
        )}
      </div>
      <DialogFooter className="border-t px-5 py-3">
        <Button type="button" variant="ghost" onClick={onDone} disabled={save.isPending}>
          {t("mockups.cancel")}
        </Button>
        <Button
          type="button"
          disabled={!blueprint || !providerId || !catalog.data || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? t("admin.mockups.linkDialog.linking") : t("admin.mockups.linkDialog.link")}
        </Button>
      </DialogFooter>
    </>
  );
};
