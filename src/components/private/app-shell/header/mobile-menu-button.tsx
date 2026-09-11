"use client";

import { Menu } from "lucide-react";

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
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label="Open menu"
          className="lg:hidden"
        >
          <Menu />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Open menu</TooltipContent>
    </Tooltip>
  );
};
