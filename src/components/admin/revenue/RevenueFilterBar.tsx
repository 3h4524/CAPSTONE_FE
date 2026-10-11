"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RevenueFilterDto } from "@/types/revenue";

interface RevenueFilterBarProps {
  filter: RevenueFilterDto;
  onFilterChange: (newFilter: RevenueFilterDto) => void;
}

export function RevenueFilterBar({ filter, onFilterChange }: RevenueFilterBarProps) {
  const handleChange = (key: keyof RevenueFilterDto, value: string | number) => {
    onFilterChange({ ...filter, [key]: value, page: 1 }); // reset page on filter change
  };

  return (
    <Card className="mb-6 border-none bg-white/50 shadow-sm backdrop-blur dark:bg-slate-900/50">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500">From:</label>
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-500">To:</label>
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border bg-slate-50 p-1 pl-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="mr-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Group by:</span>
          {(["Day", "Month", "Year"] as const).map((granularity) => (
            <Button
              key={granularity}
              variant={filter.granularity === granularity ? "default" : "ghost"}
              size="sm"
              onClick={() => handleChange("granularity", granularity)}
              className={filter.granularity === granularity ? "shadow-sm" : ""}
            >
              {granularity === "Day" ? "Daily" : granularity === "Month" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
