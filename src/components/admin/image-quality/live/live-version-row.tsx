import { RateMeter } from "@/components/admin/image-quality/rate-meter";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatImageQualityDate,
  formatImageQualityNumber,
  formatImageQualitySeconds,
  formatImageQualityUsd,
} from "@/helpers/image-quality-format";
import { getImageQualityAttempts } from "@/helpers/image-quality-live";
import type { ImageQualityLiveVersion } from "@/types/admin-image-quality";

type LiveVersionRowProps = {
  version: ImageQualityLiveVersion;
};

export const LiveVersionRow = ({ version }: LiveVersionRowProps) => {
  const decided = version.approvedImages + version.rejectedImages;
  const failed = version.failedAttempts + version.blockedAttempts;
  const isDatedOnly = version.labeledImages < version.images;
  const textChecked = version.textCheckedImages ?? 0;

  return (
    <TableRow>
      <TableCell className="py-3 pl-5 whitespace-normal sm:pl-6">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
          {version.label}
          {isDatedOnly ? (
            <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-normal text-ink-600">
              by date
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs text-ink-500">
          {formatImageQualityDate(version.sinceUtc)} →{" "}
          {version.untilUtc ? formatImageQualityDate(version.untilUtc) : "now"}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-ink-800">
        {version.images}
        <span className="block text-[11px] text-ink-500">
          {version.products} products · {version.jobs} jobs
        </span>
      </TableCell>
      <TableCell>
        {decided > 0 ? (
          <RateMeter value={version.approvalRate} caption={`${version.approvedImages}/${decided}`} />
        ) : (
          <span className="text-[13px] text-ink-500">
            {version.reviewedImages > 0 ? `${version.reviewedImages} waiting` : "No review asked"}
          </span>
        )}
      </TableCell>
      <TableCell>
        {textChecked > 0 ? (
          <RateMeter
            value={version.textOkRate ?? null}
            caption={`${version.textOkImages ?? 0}/${textChecked} · CER ${formatImageQualityNumber(version.averageCharacterErrorRate ?? null, 3)}`}
          />
        ) : (
          <span className="text-[13px] text-ink-500">Not checked</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-ink-800">
        {formatImageQualityNumber(version.regenerateRate, 2)}
        <span className="block text-[11px] text-ink-500">{version.regenerateRequests} requests</span>
      </TableCell>
      <TableCell>
        <RateMeter value={version.failureRate} caption={`${failed}/${getImageQualityAttempts(version)}`} />
      </TableCell>
      <TableCell className="text-right font-mono text-sm text-ink-800">
        {formatImageQualitySeconds(version.averageGenerationSeconds)}
      </TableCell>
      <TableCell className="pr-5 text-right font-mono text-sm text-ink-800 sm:pr-6">
        {formatImageQualityUsd(version.averageCostUsd)}
        <span className="block text-[11px] text-ink-500">
          {formatImageQualityUsd(version.totalCostUsd)} total
        </span>
      </TableCell>
    </TableRow>
  );
};
