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
import { useGenerateModelPhoto } from "@/hooks/mutations/use-model-photo-mutations";
import { productTypes } from "@/schemas/batches";
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

const startFrom = (initial?: ModelPhotoFilter): ModelAttributes =>
  cleanAttributes({
    people: initial?.people ?? "single",
    ageGroup: initial?.ageGroup ?? null,
    gender: initial?.gender ?? null,
    groupType: initial?.groupType ?? null,
  });

/**
 * Makes a model photo with AI: the people chosen, in a plain white t-shirt on a grey studio backdrop. It is kept like
 * an uploaded one, so mock-ups are then put on it without AI.
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
  const [attributes, setAttributes] = useState<ModelAttributes>(() => startFrom(initial));
  const [type, setType] = useState(productType);
  const { mutate: generate, isPending } = useGenerateModelPhoto(scope);
  // Why the last try failed, shown in the dialog itself: a toast is easy to miss behind it.
  const [failure, setFailure] = useState<string | null>(null);
  const complete = isCompleteAttributes(attributes);

  const close = () => {
    if (isPending) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("mockups.generateModelPhoto.title")}</DialogTitle>
          <DialogDescription>
            {t("mockups.generateModelPhoto.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ModelAttributesFields value={attributes} onChange={setAttributes} disabled={isPending} />
          <div className="space-y-1.5">
            <Label htmlFor="generate-model-product-type">{t("mockups.generateModelPhoto.productType")}</Label>
            <Select
              value={type}
              onValueChange={(value) => value && setType(value)}
              disabled={isPending}
            >
              <SelectTrigger id="generate-model-product-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`mockups.productTypes.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("mockups.generateModelPhoto.costNote")}
          </p>
          {isPending && (
            <p role="status" className="text-ink-600 text-xs">
              {t("mockups.generateModelPhoto.pendingNote")}
            </p>
          )}
          {failure && !isPending && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {failure}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            {t("mockups.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!complete || isPending}
            onClick={() => {
              setFailure(null);
              generate(
                { productType: type, attributes: cleanAttributes(attributes) },
                {
                  onSuccess: (photo) => {
                    onGenerated?.(photo);
                    onClose();
                  },
                  onError: (error) => setFailure(getErrorMessage(error)),
                }
              );
            }}
          >
            <Sparkles aria-hidden="true" />
            {isPending ? t("mockups.generateModelPhoto.pending") : t("mockups.generateModelPhoto.makePhoto")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
