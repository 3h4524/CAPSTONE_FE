import { CircleDollarSign, Package, Store, Target } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatUsd } from "@/helpers/seller-dashboard";
import type { DashboardKpis, DashboardPeriod } from "@/types/seller-dashboard";

const formatCount = (value: number) => value.toLocaleString();
const formatPercent = (value: number) => `${value.toFixed(1)}%`;

type KpiRowProps = {
  kpis: DashboardKpis;
  days: DashboardPeriod;
};

/** The period's four headline figures, each beside the period before. */
export const KpiRow = ({ kpis, days }: KpiRowProps) => {
  const periodLabel = `${days} days`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Products created"
        icon={Package}
        kpi={kpis.productsCreated}
        formatValue={formatCount}
        periodLabel={periodLabel}
      />
      <KpiCard
        label="Pipeline success rate"
        icon={Target}
        kpi={kpis.successRatePercent}
        formatValue={formatPercent}
        periodLabel={periodLabel}
      />
      <KpiCard
        label="Listings published"
        icon={Store}
        kpi={kpis.listingsPublished}
        formatValue={formatCount}
        periodLabel={periodLabel}
        emptyHint={
          kpis.listingsPublished.value === 0 ? "Publish your first listing to Etsy" : undefined
        }
      />
      <KpiCard
        label="AI cost per product"
        icon={CircleDollarSign}
        kpi={kpis.costPerProductUsd}
        formatValue={formatUsd}
        periodLabel={periodLabel}
        isLowerBetter
      />
    </div>
  );
};
