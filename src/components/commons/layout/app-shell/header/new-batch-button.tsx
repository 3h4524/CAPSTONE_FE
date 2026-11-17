"use client";

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const NewBatchButton = () => {
  const { t } = useTranslation("common");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden sm:inline-flex">
          <Button type="button" disabled>
            <Plus />
            <span>{t("batches.workspace.newBatch")}</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("commons.comingSoon")}</TooltipContent>
    </Tooltip>
  );
};
