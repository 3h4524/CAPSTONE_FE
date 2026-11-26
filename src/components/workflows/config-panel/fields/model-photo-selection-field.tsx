"use client";

import { useState } from "react";
import Image from "next/image";
import { UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { LibraryModelPicker } from "@/components/workflows/media/lifestyle-mockup-form";
import { productTypeLabel } from "@/helpers/mockup-template";
import { modelAttributesLabel } from "@/helpers/model-attributes";
import { hasFeature } from "@/helpers/plan-features";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useModelPhotos } from "@/hooks/queries/use-model-photos";
import { useRunProductTypeCounts } from "@/hooks/use-run-product-types";
import { cn } from "@/utils/cn";

type ModelPhotoSelectionFieldProps = {
  /** The model photo chosen per product type (lower case); a type left out gets none. */
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
  // The run's product types, then one chosen for a type the run no longer has, so it can still be removed.
  const types = [...new Set([...Object.keys(counts ?? {}), ...Object.keys(value)])];
  const typeName = (type: string) => t(`batches.productTypes.${type}`, { defaultValue: productTypeLabel(type) });

  const choose = (type: string, id: string) => {
    onChange({ ...value, [type]: id });
    setChoosing(null);
  };
  const remove = (type: string) => onChange(Object.fromEntries(Object.entries(value).filter(([key]) => key !== type)));

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">{t("workflowConfig.modelPhotoSelection.description")}</p>
      {locked && <PanelNotice tone="warning">{t("workflowConfig.modelPhotoSelection.proOnly")}</PanelNotice>}
      {types.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("workflowConfig.modelPhotoSelection.chooseBatchFirst")}</p>
      ) : (
        <ul className="bg-card divide-y overflow-hidden rounded-lg border" aria-label={t("workflowConfig.modelPhotoSelection.listLabel")}>
          {types.map((type) => (
            <ModelPhotoRow
              key={type}
              productType={type}
              label={typeName(type)}
              photoId={value[type]}
              unused={counts !== undefined && !(type in counts)}
              locked={locked}
              onChoose={() => setChoosing(type)}
              onRemove={() => remove(type)}
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
            <LibraryModelPicker
              productType={choosing}
              value={value[choosing]}
              disabled={false}
              onChange={(id) => choose(choosing, id)}
            />
          )}
        </DialogContent>
      </Dialog>
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
