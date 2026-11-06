import { CalendarDays } from "lucide-react";

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
export const PeriodSwitcher = ({ value, onChange }: PeriodSwitcherProps) => (
  <Select
    value={String(value)}
    onValueChange={(days) => onChange(Number(days) as DashboardPeriod)}
  >
    <SelectTrigger aria-label="Period" className="bg-card h-9 w-auto gap-2 rounded-full px-3.5 text-xs">
      <CalendarDays className="text-muted-foreground size-3.5" aria-hidden="true" />
      <SelectValue />
    </SelectTrigger>
    <SelectContent align="end">
      {DASHBOARD_PERIODS.map((period) => (
        <SelectItem key={period.days} value={String(period.days)} className="text-xs">
          Last {period.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
