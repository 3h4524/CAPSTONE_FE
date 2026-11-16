"use client";

import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type EditDesignPromptTriggerProps = {
  canEdit: boolean;
  onOpen: () => void;
};

export const EditDesignPromptTrigger = ({ canEdit, onOpen }: EditDesignPromptTriggerProps) => {
  const { t } = useTranslation("common");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button type="button" variant="ghost" size="icon" disabled={!canEdit} onClick={onOpen} aria-label={t("batchConfig.title")}>
            <Pencil aria-hidden="true" />
          </Button>
        </span>
      </TooltipTrigger>
      {!canEdit && <TooltipContent>{t("batchConfig.onlyPending")}</TooltipContent>}
    </Tooltip>
  );
};
