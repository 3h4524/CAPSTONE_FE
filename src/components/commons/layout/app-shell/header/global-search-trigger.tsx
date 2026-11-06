"use client";

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const GlobalSearchTrigger = () => {
  const { t } = useTranslation("common");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex w-full">
          <Button type="button" variant="outline" disabled className="w-full justify-start">
            <Search />
            <span className="text-muted-foreground">{t("header.search")}</span>
            <kbd className="text-muted-foreground ml-auto text-xs">⌘K</kbd>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("header.comingSoon")}</TooltipContent>
    </Tooltip>
  );
};
