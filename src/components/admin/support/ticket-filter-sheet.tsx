"use client";

import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AdminTicketFilters } from "@/api/admin-support";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SUPPORT_CATEGORIES } from "@/constants/support";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { TicketCategory, TicketPriority } from "@/types/support";

const ANY = "any";

const CATEGORY_LABEL_KEYS: Record<TicketCategory, string> = {
  integration: "admin.support.categories.integration",
  ai_generation: "admin.support.categories.ai_generation",
  batch_processing: "admin.support.categories.batch_processing",
  export_publishing: "admin.support.categories.export_publishing",
  billing_subscription: "admin.support.categories.billing_subscription",
  account_security: "admin.support.categories.account_security",
  other: "admin.support.categories.other",
};

const PRIORITY_LABEL_KEYS: Record<TicketPriority, string> = {
  low: "admin.support.priorities.low",
  normal: "admin.support.priorities.normal",
  high: "admin.support.priorities.high",
  urgent: "admin.support.priorities.urgent",
};

type TicketFilterSheetProps = {
  filters: AdminTicketFilters;
  onFiltersChange: (newFilters: AdminTicketFilters) => void;
};

export const TicketFilterSheet = ({ filters, onFiltersChange }: TicketFilterSheetProps) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const activeCount = Number(Boolean(filters.priority)) + Number(Boolean(filters.category));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("admin.support.filters.open")} className="text-ink-500 relative size-9 shrink-0 shadow-none max-md:size-10">
          <Filter className="size-4" aria-hidden="true" />
          {activeCount > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-blue-600" aria-hidden="true" />}
        </Button>
      </SheetTrigger>
      <SheetContent side={isPhone ? "bottom" : "right"} className="gap-0">
        <SheetHeader>
          <SheetTitle>{t("admin.support.filters.title")}</SheetTitle>
          <SheetDescription>{t("admin.support.filters.description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-filter-priority">{t("admin.support.filters.priority")}</Label>
            <Select
              value={filters.priority ?? ANY}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, priority: value === ANY ? undefined : (value as TicketPriority), pageIndex: 1 })
              }
            >
              <SelectTrigger id="ticket-filter-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("admin.support.filters.anyPriority")}</SelectItem>
                {Object.entries(PRIORITY_LABEL_KEYS).map(([value, key]) => (
                  <SelectItem key={value} value={value}>
                    {t(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-filter-category">{t("admin.support.filters.category")}</Label>
            <Select
              value={filters.category ?? ANY}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, category: value === ANY ? undefined : (value as TicketCategory), pageIndex: 1 })
              }
            >
              <SelectTrigger id="ticket-filter-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("admin.support.filters.anyCategory")}</SelectItem>
                {SUPPORT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {t(CATEGORY_LABEL_KEYS[category.value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={activeCount === 0}
            onClick={() => onFiltersChange({ ...filters, priority: undefined, category: undefined, pageIndex: 1 })}
          >
            {t("admin.support.filters.clear")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
