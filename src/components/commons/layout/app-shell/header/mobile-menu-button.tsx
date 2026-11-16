"use client";

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MobileMenuButtonProps = {
  onClick: () => void;
};

export const MobileMenuButton = ({ onClick }: MobileMenuButtonProps) => {
  const { t } = useTranslation("common");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={t("commons.siteHeader.openMenu")}
          className="max-md:hidden lg:hidden"
        >
          <Menu />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("commons.siteHeader.openMenu")}</TooltipContent>
    </Tooltip>
  );
};
