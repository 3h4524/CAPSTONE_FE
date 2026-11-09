import type { ReactNode } from "react";

import {
  LiveApproval,
  LiveFailure,
  LiveTextCheck,
  LiveVersionName,
} from "@/components/admin/image-quality/live/live-version-row";
import {
  formatImageQualityNumber,
  formatImageQualitySeconds,
  formatImageQualityUsd,
} from "@/helpers/image-quality-format";
import type { ImageQualityLiveVersion } from "@/types/admin-image-quality";

const Figure = ({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-ink-500">{label}</dt>
    <dd className="mt-0.5 font-mono text-sm text-ink-800">
      {value}
      {detail ? <span className="block text-[11px] text-ink-500">{detail}</span> : null}
    </dd>
  </div>
);

const Rate = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="mb-1 text-[11px] text-ink-500">{label}</p>
    {children}
  </div>
);

/** One provider and prompt version on a phone: every column of its table row, stacked. */
export const LiveVersionCard = ({ version }: { version: ImageQualityLiveVersion }) => (
  <li className="space-y-3 px-4 py-3">
    <div>
      <LiveVersionName version={version} />
    </div>
    <div className="space-y-2">
      <Rate label="Approved on review">
        <LiveApproval version={version} />
      </Rate>
      <Rate label="Text correct (OCR)">
        <LiveTextCheck version={version} />
      </Rate>
      <Rate label="Failed or blocked">
        <LiveFailure version={version} />
      </Rate>
    </div>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
      <Figure label="Images" value={version.images} detail={`${version.products} products · ${version.jobs} jobs`} />
      <Figure
        label="Regenerate / product"
        value={formatImageQualityNumber(version.regenerateRate, 2)}
        detail={`${version.regenerateRequests} requests`}
      />
      <Figure label="Time / image" value={formatImageQualitySeconds(version.averageGenerationSeconds)} />
      <Figure
        label="Cost / image"
        value={formatImageQualityUsd(version.averageCostUsd)}
        detail={`${formatImageQualityUsd(version.totalCostUsd)} total`}
      />
    </dl>
  </li>
);
