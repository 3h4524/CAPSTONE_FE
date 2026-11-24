"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ModelPhotoScope } from "@/api/model-photos";
import { ModelAttributesFields } from "@/components/mockups/model-attributes-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/helpers/error-message";
import { cleanAttributes, isCompleteAttributes } from "@/helpers/model-attributes";
import {
  DEFAULT_MODEL_PHOTO_STYLE,
  isStudioScene,
  MODEL_PHOTO_OUTFITS,
  MODEL_PHOTO_PRODUCT_TYPES,
  MODEL_PHOTO_SCENES,
  modelPhotoProductType,
  type ModelPhotoStyle,
  posesFor,
  styleFor,
} from "@/helpers/model-photo-styles";
import { useGenerateModelPhoto } from "@/hooks/mutations/use-model-photo-mutations";
import { usePrintWithoutAi } from "@/hooks/queries/use-print-without-ai";
import type { MockupTemplate, ModelAttributes, ModelPhotoFilter } from "@/types/mockup-templates";

type GenerateModelPhotoDialogProps = {
  open: boolean;
  scope: ModelPhotoScope;
  /** Who to start from: the people a list was narrowed to. */
  initial?: ModelPhotoFilter;
  productType?: string;
  onClose: () => void;
  onGenerated?: (photo: MockupTemplate) => void;
};

/** A labelled menu of a few choices. */
const OptionSelect = <T extends string>({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  onChange: (value: T) => void;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-ink-700 text-xs font-medium">
      {label}
    </Label>
    <Select value={value} onValueChange={(next) => next && onChange(next as T)} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const startFrom = (initial?: ModelPhotoFilter): ModelAttributes =>
  cleanAttributes({
    people: initial?.people ?? "single",
    ageGroup: initial?.ageGroup ?? null,
    gender: initial?.gender ?? null,
    groupType: initial?.groupType ?? null,
  });

/**
 * Makes a model photo with AI: the people chosen, wearing a plain white t-shirt or hoodie,
 * in the scene, outfit and pose chosen; their looks are picked at random each time. It is kept like an uploaded
 * one, for mock-ups to be put on it.
 */
export const GenerateModelPhotoDialog = ({
  open,
  scope,
  initial,
  productType = "tshirt",
  onClose,
  onGenerated,
}: GenerateModelPhotoDialogProps) => {
  const { t } = useTranslation("common");
  const printWithoutAi = usePrintWithoutAi(scope);
  const [attributes, setAttributes] = useState<ModelAttributes>(() => startFrom(initial));
  const [type, setType] = useState(() => modelPhotoProductType(productType));
  const [style, setStyle] = useState<ModelPhotoStyle>(DEFAULT_MODEL_PHOTO_STYLE);
  const group = attributes.people === "group";
  // The photo as soon as it is drawn, while it is still being saved.
  const [preview, setPreview] = useState<string | null>(null);
  const { mutate: generate, isPending } = useGenerateModelPhoto(scope, {
    onPreview: setPreview,
    onSaved: onGenerated,
  });
  // Why the last try failed, shown in the dialog itself: a toast is easy to miss behind it.
  const [failure, setFailure] = useState<string | null>(null);
  const complete = isCompleteAttributes(attributes);

  // Once the photo is drawn it is saved whether or not this stays open.
  const closable = !isPending || preview !== null;
  const close = () => {
    if (!closable) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("mockups.generateModelPhoto.title")}</DialogTitle>
          <DialogDescription>
            {t(printWithoutAi ? "mockups.generateModelPhoto.description" : "mockups.generateModelPhoto.descriptionAi")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {preview ? (
            <div className="bg-muted flex justify-center overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- a temporary Ideogram link, which next/image does not allow */}
              <img
                src={preview}
                alt={t("mockups.generateModelPhoto.previewAlt")}
                referrerPolicy="no-referrer"
                className="max-h-[55vh] w-auto object-contain"
              />
            </div>
          ) : (
            <>
              <ModelAttributesFields
                value={attributes}
                onChange={(next) => {
                  setAttributes(next);
                  setStyle((current) => styleFor(current, next.people === "group"));
                }}
                disabled={isPending}
              />
              {/* The product and the look side by side: four short menus rather than rows of chips. */}
              <div className="border-ink-200 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2">
                <OptionSelect
                  id="generate-model-product-type"
                  label={t("mockups.generateModelPhoto.productType")}
                  value={type}
                  options={MODEL_PHOTO_PRODUCT_TYPES.map((value) => ({ value, label: t(`mockups.productTypes.${value}`) }))}
                  disabled={isPending}
                  onChange={setType}
                />
                <OptionSelect
                  id="generate-model-scene"
                  label={t("mockups.generateModelPhoto.scene")}
                  value={style.scene}
                  options={MODEL_PHOTO_SCENES.map((value) => ({ value, label: t(`mockups.generateModelPhoto.scenes.${value}`) }))}
                  disabled={isPending}
                  onChange={(scene) => setStyle({ ...style, scene })}
                />
                <OptionSelect
                  id="generate-model-outfit"
                  label={t("mockups.generateModelPhoto.outfit")}
                  value={style.outfit}
                  options={MODEL_PHOTO_OUTFITS.map((value) => ({ value, label: t(`mockups.generateModelPhoto.outfits.${value}`) }))}
                  disabled={isPending}
                  onChange={(outfit) => setStyle({ ...style, outfit })}
                />
                <OptionSelect
                  id="generate-model-pose"
                  label={t("mockups.generateModelPhoto.pose")}
                  value={style.pose}
                  options={posesFor(group).map((value) => ({ value, label: t(`mockups.generateModelPhoto.poses.${value}`) }))}
                  disabled={isPending}
                  onChange={(pose) => setStyle({ ...style, pose })}
                />
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t("mockups.generateModelPhoto.lookNote")}
                {printWithoutAi && !isStudioScene(style.scene) && ` ${t("mockups.generateModelPhoto.placeNote")}`}{" "}
                {t(printWithoutAi ? "mockups.generateModelPhoto.costNote" : "mockups.generateModelPhoto.costNoteAi")}
              </p>
            </>
          )}
          {isPending && (
            <p role="status" className="text-ink-600 text-xs">
              {preview
                ? t("mockups.generateModelPhoto.savingNote")
                : t(printWithoutAi ? "mockups.generateModelPhoto.pendingNote" : "mockups.generateModelPhoto.pendingNoteAi")}
            </p>
          )}
          {failure && !isPending && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {failure}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={!closable}>
            {isPending && preview ? t("mockups.generateModelPhoto.close") : t("mockups.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!complete || isPending}
            onClick={() => {
              setFailure(null);
              setPreview(null);
              generate(
                { productType: type, attributes: cleanAttributes(attributes), style },
                {
                  onSuccess: () => {
                    setPreview(null);
                    onClose();
                  },
                  onError: (error) => {
                    setPreview(null);
                    setFailure(getErrorMessage(error));
                  },
                }
              );
            }}
          >
            <Sparkles aria-hidden="true" />
            {isPending
              ? t(preview ? "mockups.generateModelPhoto.saving" : "mockups.generateModelPhoto.pending")
              : t("mockups.generateModelPhoto.makePhoto")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
