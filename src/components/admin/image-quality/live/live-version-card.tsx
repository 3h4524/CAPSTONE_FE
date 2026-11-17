import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
    <dt className="text-ink-500 text-[11px]">{label}</dt>
    <dd className="text-ink-800 mt-0.5 font-mono text-sm">
      {value}
      {detail ? <span className="text-ink-500 block text-[11px]">{detail}</span> : null}
    </dd>
  </div>
);

const Rate = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="text-ink-500 mb-1 text-[11px]">{label}</p>
    {children}
  </div>
);

/** One provider and prompt version on a phone: every column of its table row, stacked. */
export const LiveVersionCard = ({ version }: { version: ImageQualityLiveVersion }) => {
  const { t } = useTranslation("common");

  return (
    <li className="space-y-3 px-4 py-3">
      <div>
        <LiveVersionName version={version} />
      </div>
      <div className="space-y-2">
        <Rate label={t("admin.imageQuality.shared.approvedOnReview")}>
          <LiveApproval version={version} />
        </Rate>
        <Rate label={t("admin.imageQuality.shared.textCorrectOcr")}>
          <LiveTextCheck version={version} />
        </Rate>
        <Rate label={t("admin.imageQuality.shared.failedOrBlocked")}>
          <LiveFailure version={version} />
        </Rate>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Figure
          label={t("admin.imageQuality.shared.images")}
          value={version.images}
          detail={t("admin.imageQuality.live.productsJobs", { products: version.products, jobs: version.jobs })}
        />
        <Figure
          label={t("admin.imageQuality.shared.regeneratePerProduct")}
          value={formatImageQualityNumber(version.regenerateRate, 2)}
          detail={t("admin.imageQuality.live.requestsCount", { count: version.regenerateRequests })}
        />
        <Figure label={t("admin.imageQuality.shared.timePerImage")} value={formatImageQualitySeconds(version.averageGenerationSeconds)} />
        <Figure
          label={t("admin.imageQuality.shared.costPerImage")}
          value={formatImageQualityUsd(version.averageCostUsd)}
          detail={t("admin.imageQuality.live.totalSuffix", { value: formatImageQualityUsd(version.totalCostUsd) })}
        />
      </dl>
    </li>
  );
};
