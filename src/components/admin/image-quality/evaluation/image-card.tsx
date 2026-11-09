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
    <figure className="bg-card m-0 flex min-w-0 flex-col gap-2.5 rounded-lg p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] max-md:w-40 max-md:shrink-0 max-md:snap-start">
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
        <div className="bg-ink-100 text-ink-500 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md px-3 text-center text-xs">
          <ImageOff className="size-5" />
          Image only on the scoring machine
        </div>
      )}
      <figcaption className="flex min-w-0 flex-col gap-2 text-[13px]">
        <span className="text-ink-900 leading-snug font-semibold">{versionLabel}</span>
        <span className="flex flex-wrap gap-1">
          {image.textOk !== null ? (
            <CheckChip label={image.textOk ? "Text correct" : "Text wrong"} isPassed={image.textOk} />
          ) : (
            <span className="bg-ink-100 text-ink-600 rounded-full px-2 py-0.5 text-xs">
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
        {image.note ? <span className="text-ink-700 leading-snug">{image.note}</span> : null}
        {image.ocrText ? (
          <span className="bg-ink-50 text-ink-600 rounded px-1.5 py-1 font-mono text-[11px] break-words">
            OCR: {image.ocrText}
          </span>
        ) : null}
        <dl className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-ink-50 rounded py-1">
            <dt className="text-ink-500 text-[10px] uppercase">CLIP</dt>
            <dd className="text-ink-800 font-mono text-xs">
              {formatImageQualityNumber(image.clipOverall, 1)}
            </dd>
          </div>
          <div className="bg-ink-50 rounded py-1">
            <dt className="text-ink-500 text-[10px] uppercase">MUSIQ</dt>
            <dd className="text-ink-800 font-mono text-xs">
              {formatImageQualityNumber(image.musiq, 1)}
            </dd>
          </div>
          <div className="bg-ink-50 rounded py-1">
            <dt className="text-ink-500 text-[10px] uppercase">LAION</dt>
            <dd className="text-ink-800 font-mono text-xs">
              {formatImageQualityNumber(image.laionAes, 2)}
            </dd>
          </div>
        </dl>
      </figcaption>
    </figure>
  );
};
