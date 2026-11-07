/* eslint-disable @next/next/no-img-element */
import { ImageOff } from "lucide-react";

import { CheckChip } from "@/components/admin/image-quality/evaluation/check-chip";
import { formatImageQualityNumber } from "@/helpers/image-quality-format";
import type { ImageEvalImage } from "@/types/admin-image-quality";
import { cn } from "@/utils/cn";

type ImageCardProps = {
  image: ImageEvalImage;
  versionLabel: string;
  isAfter: boolean;
};

export const ImageCard = ({ image, versionLabel, isAfter }: ImageCardProps) => {
  const source = image.thumbnailUrl ?? image.imageUrl;

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2.5 rounded-lg bg-white p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      {source ? (
        <a
          href={image.imageUrl ?? source}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "block overflow-hidden rounded-md bg-[#808080]",
            isAfter && "ring-2 ring-sky-600"
          )}
        >
          <img
            src={source}
            alt={`${image.product}, ${versionLabel}`}
            loading="lazy"
            className="aspect-square w-full object-contain"
          />
        </a>
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md bg-slate-100 px-3 text-center text-xs text-slate-500">
          <ImageOff className="size-5" />
          Image only on the scoring machine
        </div>
      )}
      <figcaption className="flex min-w-0 flex-col gap-2 text-[13px]">
        <span className="leading-snug font-semibold text-slate-900">{versionLabel}</span>
        <span className="flex flex-wrap gap-1">
          {image.textOk !== null ? (
            <CheckChip label={image.textOk ? "Text correct" : "Text wrong"} isPassed={image.textOk} />
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              No lettering
            </span>
          )}
          {image.textClear !== null ? (
            <CheckChip label={image.textClear ? "Clear" : "Covered"} isPassed={image.textClear} />
          ) : null}
          {image.layoutOk !== null ? (
            <CheckChip label="Layout" isPassed={image.layoutOk} />
          ) : null}
        </span>
        {image.note ? <span className="leading-snug text-slate-700">{image.note}</span> : null}
        {image.ocrText ? (
          <span className="rounded bg-slate-50 px-1.5 py-1 font-mono text-[11px] break-words text-slate-600">
            OCR: {image.ocrText}
          </span>
        ) : null}
        <dl className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded bg-slate-50 py-1">
            <dt className="text-[10px] text-slate-500 uppercase">CLIP</dt>
            <dd className="font-mono text-xs text-slate-800">
              {formatImageQualityNumber(image.clipOverall, 1)}
            </dd>
          </div>
          <div className="rounded bg-slate-50 py-1">
            <dt className="text-[10px] text-slate-500 uppercase">MUSIQ</dt>
            <dd className="font-mono text-xs text-slate-800">
              {formatImageQualityNumber(image.musiq, 1)}
            </dd>
          </div>
          <div className="rounded bg-slate-50 py-1">
            <dt className="text-[10px] text-slate-500 uppercase">LAION</dt>
            <dd className="font-mono text-xs text-slate-800">
              {formatImageQualityNumber(image.laionAes, 2)}
            </dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
};
