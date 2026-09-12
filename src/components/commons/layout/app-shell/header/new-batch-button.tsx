"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const NewBatchButton = () => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden sm:inline-flex">
          <Button type="button" disabled>
            <Plus />
            <span>New batch</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  );
};
