"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarStore } from "@/stores/sidebar";

export const CollapseToggle = () => {
  const { t } = useTranslation("common");
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? t("commons.sidebar.expand") : t("commons.sidebar.collapse")}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {isCollapsed ? t("commons.sidebar.expand") : t("commons.sidebar.collapse")}
      </TooltipContent>
    </Tooltip>
  );
};
