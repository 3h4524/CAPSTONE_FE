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

// The cells a phone's card shows as well, so the two cannot read differently.
export const LiveVersionName = ({ version }: LiveVersionRowProps) => (
  <>
    <span className="text-ink-900 flex flex-wrap items-center gap-2 text-sm font-medium">
      {version.label}
      {version.labeledImages < version.images ? (
        <span className="bg-ink-100 text-ink-600 rounded px-1.5 py-0.5 text-[11px] font-normal">
          by date
        </span>
      ) : null}
    </span>
    <span className="text-ink-500 mt-0.5 block text-xs">
      {formatImageQualityDate(version.sinceUtc)} →{" "}
      {version.untilUtc ? formatImageQualityDate(version.untilUtc) : "now"}
    </span>
  </>
);

export const LiveApproval = ({ version }: LiveVersionRowProps) => {
  const decided = version.approvedImages + version.rejectedImages;
  return decided > 0 ? (
    <RateMeter value={version.approvalRate} caption={`${version.approvedImages}/${decided}`} />
  ) : (
    <span className="text-ink-500 text-[13px]">
      {version.reviewedImages > 0 ? `${version.reviewedImages} waiting` : "No review asked"}
    </span>
  );
};

export const LiveTextCheck = ({ version }: LiveVersionRowProps) => {
  const textChecked = version.textCheckedImages ?? 0;
  return textChecked > 0 ? (
    <RateMeter
      value={version.textOkRate ?? null}
      caption={`${version.textOkImages ?? 0}/${textChecked} · CER ${formatImageQualityNumber(version.averageCharacterErrorRate ?? null, 3)}`}
    />
  ) : (
    <span className="text-ink-500 text-[13px]">Not checked</span>
  );
};

export const LiveFailure = ({ version }: LiveVersionRowProps) => (
  <RateMeter
    value={version.failureRate}
    caption={`${version.failedAttempts + version.blockedAttempts}/${getImageQualityAttempts(version)}`}
  />
);

export const LiveVersionRow = ({ version }: LiveVersionRowProps) => {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5 whitespace-normal sm:pl-6">
        <LiveVersionName version={version} />
      </TableCell>
      <TableCell className="text-ink-800 text-right font-mono text-sm">
        {version.images}
        <span className="text-ink-500 block text-[11px]">
          {version.products} products · {version.jobs} jobs
        </span>
      </TableCell>
      <TableCell>
        <LiveApproval version={version} />
      </TableCell>
      <TableCell>
        <LiveTextCheck version={version} />
      </TableCell>
      <TableCell className="text-ink-800 text-right font-mono text-sm">
        {formatImageQualityNumber(version.regenerateRate, 2)}
        <span className="text-ink-500 block text-[11px]">{version.regenerateRequests} requests</span>
      </TableCell>
      <TableCell>
        <LiveFailure version={version} />
      </TableCell>
      <TableCell className="text-ink-800 text-right font-mono text-sm">
        {formatImageQualitySeconds(version.averageGenerationSeconds)}
      </TableCell>
      <TableCell className="text-ink-800 pr-5 text-right font-mono text-sm sm:pr-6">
        {formatImageQualityUsd(version.averageCostUsd)}
        <span className="text-ink-500 block text-[11px]">
          {formatImageQualityUsd(version.totalCostUsd)} total
        </span>
      </TableCell>
    </TableRow>
  );
};
