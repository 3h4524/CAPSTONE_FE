"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { ImageIcon, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { MockupKindBadge } from "@/components/mockups/mockup-kind-badge";
import { PhotoSourceTag } from "@/components/mockups/model-attributes-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { garmentColorName } from "@/helpers/garment-colors";
import { isAutomaticPlacement, mockupViewLabel, parsePrintLayout, templateView } from "@/helpers/mockup-template";
import { modelAttributesLabel } from "@/helpers/model-attributes";
import { photoEdgeColor } from "@/helpers/photo-edge-color";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateListItemProps = {
  template: MockupTemplate;
  busy?: boolean;
  /** Whether the edit and delete buttons show; by default only on the seller's own templates. */
  editable?: boolean;
  onEdit: (template: MockupTemplate) => void;
  onDelete: (template: MockupTemplate) => void;
  /** More buttons beside Edit and Delete. */
  extraActions?: ReactNode;
};

export const MockupTemplateListItem = ({
  template,
  busy = false,
  editable = template.isMine,
  onEdit,
  onDelete,
  extraActions,
}: MockupTemplateListItemProps) => {
  const { t } = useTranslation("common");
  const [viewing, setViewing] = useState<number | null>(null);
  // The photo's own backdrop color, so the space beside it does not show as a band of another gray.
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const layout = template.kind === "model" ? null : parsePrintLayout(template.printAreaConfig);
  // Kept by address, so a photo replaced through Edit is tried again.
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null);
  const isImageBroken = brokenImageUrl === template.baseImageUrl;
  const isModel = template.kind === "model";
  // What the photo is, as one quiet line of text rather than a row of tags: the product, then who is in it.
  const summary = [
    t(`mockups.productTypes.${template.productType}`, { defaultValue: template.productType }),
    isModel ? modelAttributesLabel(template.attributes) : null,
  ].filter(Boolean).join(" · ");
  // Only what sets this photo apart is a tag; the usual (a model photo's automatic placement, its print maps) is not.
  const featureClass = "text-ink-600 border-ink-200 font-normal";
  const features = [
    !isModel && <MockupKindBadge key="kind" template={template} />,
    !isModel && template.realisticPrintReady && (
      <Badge key="realistic" variant="outline" className={featureClass}>{t("mockups.templateCard.realisticPrint")}</Badge>
    ),
    !isModel && template.allowRecolor && (
      <Badge key="recolor" variant="outline" className={featureClass}>{t("mockups.templateCard.recolorable")}</Badge>
    ),
    !isModel && layout && layout.view !== "front" && (
      <Badge key="view" variant="outline" className={featureClass}>{mockupViewLabel(layout.view)}</Badge>
    ),
    template.views && template.views.length > 0 && (
      <Badge key="views" variant="outline" className={featureClass}>
        {t("mockups.templateCard.frontAnd", { sides: template.views.map((side) => mockupViewLabel(templateView(side)).toLowerCase()).join(", ") })}
      </Badge>
    ),
    !isModel && layout && layout.areas.length > 1 && (
      <Badge key="areas" variant="outline" className={featureClass}>{t("mockups.templateCard.printAreasCount", { count: layout.areas.length })}</Badge>
    ),
    isModel && !isAutomaticPlacement(template.printAreaConfig) && (
      <Badge key="area" variant="outline" className={featureClass}>{t("mockups.templateCard.ownPrintArea")}</Badge>
    ),
    template.garmentColor && (
      <Badge key="color" variant="outline" className={cn(featureClass, "gap-1.5")}>
        <GarmentColorSwatch hex={template.garmentColor} />
        {garmentColorName(template.garmentColor)}
      </Badge>
    ),
  ].filter(Boolean);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* A product photo whole, never cropped; a photo of people fills the frame from the top (heads and the garment),
          with no bands beside it. A click shows either whole and large. */}
      <button
        type="button"
        onClick={() => setViewing(0)}
        disabled={isImageBroken}
        aria-label={t("mockups.templateCard.viewLabel", { templateName: template.name })}
        className="bg-ink-100 relative block aspect-[4/3] w-full shrink-0 cursor-zoom-in overflow-hidden disabled:cursor-default"
        style={backdrop && !isImageBroken && !isModel ? { backgroundColor: backdrop } : undefined}
      >
        {isImageBroken ? (
          <span className="text-ink-400 absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-8" aria-hidden="true" />
          </span>
        ) : (
          <Image
            src={template.baseImageUrl}
            alt={template.name}
            width={template.outputWidthPx || 640}
            height={template.outputHeightPx || 480}
            unoptimized
            crossOrigin="anonymous"
            onLoad={(event) => !isModel && setBackdrop(photoEdgeColor(event.currentTarget))}
            onError={() => setBrokenImageUrl(template.baseImageUrl)}
            className={cn("absolute inset-0 h-full w-full", isModel ? "object-cover object-[50%_8%]" : "object-contain")}
          />
        )}
        <PhotoSourceTag system={template.isSystemTemplate} className="absolute top-1.5 right-1.5 md:hidden" />
        {template.aiGenerated && (
          <span
            title={t("mockups.templateCard.madeWithAi")}
            className="bg-card/90 text-ink-700 absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur-sm"
          >
            <Sparkles className="size-3" aria-hidden="true" />
            {t("mockups.templateCard.ai")}
          </span>
        )}
        {!isImageBroken && template.garmentColor && template.garmentMaskUrl && (
          // Same geometry as the photo's own fit, so the mask stays aligned with it.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{
              backgroundColor: template.garmentColor,
              maskImage: `url(${template.garmentMaskUrl})`,
              WebkitMaskImage: `url(${template.garmentMaskUrl})`,
              maskSize: isModel ? "cover" : "contain",
              WebkitMaskSize: isModel ? "cover" : "contain",
              maskPosition: isModel ? "50% 8%" : "center",
              WebkitMaskPosition: isModel ? "50% 8%" : "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
        )}
      </button>
      <ImageLightbox
        images={[
          {
            id: template.id,
            url: template.baseImageUrl,
            alt: template.name,
            caption: template.name,
            width: template.outputWidthPx,
            height: template.outputHeightPx,
            backdrop: backdrop ?? undefined,
            tint:
              template.garmentColor && template.garmentMaskUrl
                ? { color: template.garmentColor, maskUrl: template.garmentMaskUrl }
                : undefined,
          },
        ]}
        index={viewing}
        onIndexChange={setViewing}
      />
      <CardContent className="flex flex-col gap-1 p-4 max-md:p-2.5">
        <div className="flex items-center gap-2">
          {/* Names often differ only at the end, so a phone gives them a second line. */}
          <p className="text-ink-900 min-w-0 flex-1 truncate font-semibold max-md:line-clamp-2 max-md:text-sm max-md:whitespace-normal">{template.name}</p>
          <PhotoSourceTag system={template.isSystemTemplate} className="max-md:hidden" />
        </div>
        <p className="text-ink-700 truncate text-sm max-md:text-xs">{summary}</p>
        <p className="text-ink-500 text-xs">
          <span className="max-md:hidden">
            {template.outputWidthPx} × {template.outputHeightPx}
            {" · "}
          </span>
          {t("mockups.templateCard.usedCount", { count: template.usageCount })}
        </p>
        {features.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1 max-md:[&>*]:max-w-full max-md:[&>*]:whitespace-normal">{features}</div>
        )}
        {editable && (
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:flex-1"
              disabled={busy}
              onClick={() => onEdit(template)}
            >
              <Pencil aria-hidden="true" />
              <span className="max-md:sr-only">{t("mockups.edit")}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-md:flex-1"
              disabled={busy}
              onClick={() => onDelete(template)}
            >
              <Trash2 aria-hidden="true" />
              <span className="max-md:sr-only">{t("mockups.delete")}</span>
            </Button>
            {extraActions}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
