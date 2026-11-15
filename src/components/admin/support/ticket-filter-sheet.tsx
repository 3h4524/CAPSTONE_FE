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
import { PRIORITY_LABELS, SUPPORT_CATEGORIES } from "@/constants/support";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { TicketCategory, TicketPriority } from "@/types/support";

const ANY = "any";

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
        <Button variant="outline" size="icon" aria-label={t("adminUi.supportFilters.open")} className="text-ink-500 relative size-9 shrink-0 shadow-none max-md:size-10">
          <Filter className="size-4" aria-hidden="true" />
          {activeCount > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-blue-600" aria-hidden="true" />}
        </Button>
      </SheetTrigger>
      <SheetContent side={isPhone ? "bottom" : "right"} className="gap-0">
        <SheetHeader>
          <SheetTitle>{t("adminUi.supportFilters.title")}</SheetTitle>
          <SheetDescription>{t("adminUi.supportFilters.description")}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-filter-priority">{t("adminUi.supportFilters.priority")}</Label>
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
                <SelectItem value={ANY}>{t("adminUi.supportFilters.anyPriority")}</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-filter-category">{t("adminUi.supportFilters.category")}</Label>
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
                <SelectItem value={ANY}>{t("adminUi.supportFilters.anyCategory")}</SelectItem>
                {SUPPORT_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
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
            {t("adminUi.supportFilters.clear")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
