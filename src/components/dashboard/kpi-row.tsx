import { CircleDollarSign, Package, Store, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatUsd } from "@/helpers/seller-dashboard";
import type { DashboardKpis, DashboardPeriod } from "@/types/seller-dashboard";

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

type KpiRowProps = {
  kpis: DashboardKpis;
  days: DashboardPeriod;
};

/** The period's four headline figures, each beside the period before. */
export const KpiRow = ({ kpis, days }: KpiRowProps) => {
  const { t, i18n } = useTranslation("common");
  const formatCount = (value: number) => new Intl.NumberFormat(i18n.language).format(value);
  const periodLabel = t("dashboard.kpi.periodDays", { count: days });

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        label={t("dashboard.kpi.productsCreated")}
        icon={Package}
        kpi={kpis.productsCreated}
        formatValue={formatCount}
        periodLabel={periodLabel}
      />
      <KpiCard
        label={t("dashboard.kpi.pipelineSuccess")}
        shortLabel={t("dashboard.kpi.pipelineSuccessShort")}
        icon={Target}
        kpi={kpis.successRatePercent}
        formatValue={formatPercent}
        periodLabel={periodLabel}
      />
      <KpiCard
        label={t("dashboard.kpi.listingsPublished")}
        icon={Store}
        kpi={kpis.listingsPublished}
        formatValue={formatCount}
        periodLabel={periodLabel}
        emptyHint={
          kpis.listingsPublished.value === 0 ? t("dashboard.kpi.publishFirst") : undefined
        }
      />
      <KpiCard
        label={t("dashboard.kpi.aiCostPerProduct")}
        shortLabel={t("dashboard.kpi.aiCostPerProductShort")}
        icon={CircleDollarSign}
        kpi={kpis.costPerProductUsd}
        formatValue={formatUsd}
        periodLabel={periodLabel}
        isLowerBetter
      />
    </div>
  );
};
