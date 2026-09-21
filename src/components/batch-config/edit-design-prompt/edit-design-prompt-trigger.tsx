"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type EditDesignPromptTriggerProps = {
  canEdit: boolean;
  onOpen: () => void;
};

export const EditDesignPromptTrigger = ({ canEdit, onOpen }: EditDesignPromptTriggerProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">
        <Button type="button" variant="ghost" size="icon" disabled={!canEdit} onClick={onOpen} aria-label="Edit design prompt">
          <Pencil aria-hidden="true" />
        </Button>
      </span>
    </TooltipTrigger>
    {!canEdit && <TooltipContent>Only rows waiting for processing can be edited</TooltipContent>}
  </Tooltip>
);
