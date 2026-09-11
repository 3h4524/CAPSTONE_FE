"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const GlobalSearchTrigger = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden w-full md:inline-flex">
          <Button type="button" variant="outline" disabled className="w-full justify-start">
            <Search />
            <span className="text-muted-foreground">Search...</span>
            <kbd className="text-muted-foreground text-xs">⌘K</kbd>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  );
};
