import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DASHBOARD_PERIODS } from "@/constants/seller-dashboard";
import type { DashboardPeriod } from "@/types/seller-dashboard";

type PeriodSwitcherProps = {
  value: DashboardPeriod;
  onChange: (days: DashboardPeriod) => void;
};

/** Picks the period the Dashboard's figures cover. */
export const PeriodSwitcher = ({ value, onChange }: PeriodSwitcherProps) => {
  const { t } = useTranslation("common");
  return (
  <Select
    value={String(value)}
    onValueChange={(days) => onChange(Number(days) as DashboardPeriod)}
  >
    <SelectTrigger aria-label={t("dashboard.periods.label")} className="bg-card h-9 w-auto gap-2 rounded-full px-3.5 text-xs">
      <CalendarDays className="text-muted-foreground size-3.5" aria-hidden="true" />
      <SelectValue />
    </SelectTrigger>
    <SelectContent align="end">
      {DASHBOARD_PERIODS.map((period) => (
        <SelectItem key={period.days} value={String(period.days)} className="text-xs">
          {t("dashboard.periods.lastDays", { count: period.days })}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  );
};
