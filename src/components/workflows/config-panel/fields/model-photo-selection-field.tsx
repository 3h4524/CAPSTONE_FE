"use client";

import { useState } from "react";
import Image from "next/image";
import { UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import {
  LibraryModelPicker,
  type PeopleSource,
  PeopleSourceSwitch,
  UploadPhoto,
} from "@/components/workflows/media/lifestyle-mockup-form";
import { productTypeLabel } from "@/helpers/mockup-template";
import { APPAREL_TYPES, modelAttributesLabel, modelCategory } from "@/helpers/model-attributes";
import { hasFeature } from "@/helpers/plan-features";
import { useSaveModelPhoto } from "@/hooks/mutations/use-model-photo-mutations";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useModelPhotos } from "@/hooks/queries/use-model-photos";
import { useRunProductTypeCounts } from "@/hooks/use-run-product-types";
import { cn } from "@/utils/cn";

type ModelPhotoSelectionFieldProps = {
  /**
   * The model photo chosen per group of product types (lower case): "apparel" for t-shirts and hoodies, the type
   * itself otherwise. A group left out gets none.
   */
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
};

/**
 * The model photo AI dresses in each design's main mock-up once the run has made it, chosen per product type of the
 * batch: one photo per design, waiting at Mockup Approval with the other mock-ups. Lifestyle images are a Pro feature.
 */
export const ModelPhotoSelectionField = ({ value, onChange }: ModelPhotoSelectionFieldProps) => {
  const { t } = useTranslation("common");
  const counts = useRunProductTypeCounts();
  const { data: entitlements } = useEntitlements();
  const locked = entitlements !== undefined && !hasFeature(entitlements, "lifestyle_mockup");
  const [choosing, setChoosing] = useState<string | null>(null);
  // One row per group of product types: a t-shirt and a hoodie share their model photos (apparel). The run's groups
  // come first, then one chosen for a group the run no longer has, so it can still be removed.
  const runCategories = new Set(Object.keys(counts ?? {}).map(modelCategory));
  const categories = [...new Set([...runCategories, ...Object.keys(value).map(modelCategory)])];
  // A workflow saved before the groups kept a top's photo under "tshirt" or "hoodie": it shows under apparel, the
  // group's own key first, as the run reads it.
  const photoOf = (category: string) =>
    value[category] ?? Object.entries(value).find(([key]) => modelCategory(key) === category)?.[1];
  const typeName = (type: string) => t(`batches.productTypes.${type}`, { defaultValue: productTypeLabel(type) });
  const without = (category: string) =>
    Object.fromEntries(Object.entries(value).filter(([key]) => modelCategory(key) !== category));

  const choose = (category: string, id: string) => {
    onChange({ ...without(category), [category]: id });
    setChoosing(null);
  };
  const remove = (category: string) => onChange(without(category));

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">{t("workflowConfig.modelPhotoSelection.description")}</p>
      {locked && <PanelNotice tone="warning">{t("workflowConfig.modelPhotoSelection.proOnly")}</PanelNotice>}
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("workflowConfig.modelPhotoSelection.chooseBatchFirst")}</p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-lg border" aria-label={t("workflowConfig.modelPhotoSelection.listLabel")}>
          {categories.map((category) => (
            <ModelPhotoRow
              key={category}
              productType={category}
              label={typeName(category)}
              photoId={photoOf(category)}
              unused={counts !== undefined && !runCategories.has(category)}
              locked={locked}
              onChoose={() => setChoosing(category)}
              onRemove={() => remove(category)}
            />
          ))}
        </ul>
      )}
      <Dialog open={choosing !== null} onOpenChange={(open) => !open && setChoosing(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl">
          <DialogHeader className="text-left">
            <DialogTitle>
              {t("workflowConfig.modelPhotoSelection.chooseTitle", { type: choosing ? typeName(choosing) : "" })}
            </DialogTitle>
            <DialogDescription>{t("workflowConfig.modelPhotoSelection.chooseDescription")}</DialogDescription>
          </DialogHeader>
          {choosing && (
            <ChooseModelPhoto
              key={choosing}
              category={choosing}
              value={photoOf(choosing)}
              onChosen={(id) => choose(choosing, id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/**
 * The people a group's designs are put on, chosen as in the AI lifestyle image form: a photo the seller uploads, or one
 * of the model photos. A workflow keeps only a model photo's id, so an uploaded photo is saved with the seller's own
 * model photos (as a t-shirt's for apparel) and that one is chosen.
 */
const ChooseModelPhoto = ({
  category,
  value,
  onChosen,
}: {
  category: string;
  value: string | undefined;
  onChosen: (id: string) => void;
}) => {
  const { t } = useTranslation("common");
  // A photo already chosen is one of the model photos; otherwise the upload comes first, as in the lifestyle form.
  const [source, setSource] = useState<PeopleSource>(value ? "library" : "upload");
  const [file, setFile] = useState<File | undefined>();
  const [rights, setRights] = useState(false);
  const { mutateAsync: save, isPending } = useSaveModelPhoto("seller");

  const upload = async () => {
    if (!file) return;
    const base = file.name.replace(/\.[^.]+$/, "").trim() || t("workflowConfig.modelPhotoSelection.uploadedName");
    const photo = await save({
      id: null,
      // Unique among the seller's photos: the same file can be uploaded for another workflow.
      name: `${base.slice(0, 100)} · ${Math.random().toString(36).slice(2, 8)}`,
      productType: category === "apparel" ? APPAREL_TYPES[0] : category,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      photo: file,
      garmentSelection: null,
      findGarment: true,
      autoPlacement: true,
      printQuad: null,
      attributes: null,
    }).catch(() => null);
    if (photo) onChosen(photo.id);
  };

  return (
    <div className="min-w-0 space-y-3">
      <PeopleSourceSwitch value={source} onChange={setSource} disabled={isPending} />
      {source === "library" ? (
        <LibraryModelPicker productType={category} value={value} disabled={isPending} onChange={onChosen} />
      ) : (
        <div className="space-y-3">
          <UploadPhoto value={file} onChange={setFile} disabled={isPending} />
          <label className="flex items-start gap-2">
            <Checkbox
              checked={rights}
              disabled={isPending}
              onCheckedChange={(checked) => setRights(checked === true)}
              className="mt-0.5"
            />
            <span className="text-ink-700 text-xs leading-relaxed">{t("workflowMedia.lifestyle.rightsConfirm")}</span>
          </label>
          <p className="text-muted-foreground text-xs">{t("workflowConfig.modelPhotoSelection.uploadNote")}</p>
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={!file || !rights || isPending} onClick={upload}>
              {isPending ? t("workflowConfig.modelPhotoSelection.saving") : t("workflowConfig.modelPhotoSelection.usePhoto")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// One product type: the photo chosen for it (or none), with a way to choose, change or remove it.
const ModelPhotoRow = ({
  productType,
  label,
  photoId,
  unused,
  locked,
  onChoose,
  onRemove,
}: {
  productType: string;
  label: string;
  photoId: string | undefined;
  unused: boolean;
  locked: boolean;
  onChoose: () => void;
  onRemove: () => void;
}) => {
  const { t } = useTranslation("common");
  const { data: photos } = useModelPhotos("seller", productType, photoId !== undefined);
  const photo = photos?.find((item) => item.id === photoId);
  // Deleted, or no longer shared, since it was chosen: the run would refuse it.
  const gone = photoId !== undefined && photos !== undefined && !photo;

  return (
    <li className={cn("flex items-center gap-3 px-2.5 py-2", unused && "bg-ink-50/80")}>
      {photo ? (
        <Image
          src={photo.baseImageUrl}
          alt=""
          width={40}
          height={48}
          unoptimized
          className={cn("bg-muted h-12 w-10 shrink-0 rounded-md object-cover", unused && "opacity-60")}
        />
      ) : (
        <span className="bg-ink-50 text-ink-400 flex h-12 w-10 shrink-0 items-center justify-center rounded-md border border-dashed">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-ink-900 truncate text-sm font-medium">{label}</p>
        <p className={cn("truncate text-xs", gone ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
          {photoId === undefined
            ? t("workflowConfig.modelPhotoSelection.none")
            : photo
              ? (modelAttributesLabel(photo.attributes) ?? photo.name)
              : gone
                ? t("workflowConfig.modelPhotoSelection.gone")
                : t("workflowConfig.modelPhotoSelection.loading")}
        </p>
        {unused && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("workflowConfig.modelPhotoSelection.notUsed")}</p>}
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 px-3 hover:translate-y-0" disabled={locked} onClick={onChoose}>
        {photoId === undefined ? t("workflowConfig.modelPhotoSelection.choose") : t("workflowConfig.modelPhotoSelection.change")}
      </Button>
      {photoId !== undefined && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 hover:translate-y-0"
          aria-label={t("workflowConfig.modelPhotoSelection.remove", { type: label })}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </li>
  );
};
