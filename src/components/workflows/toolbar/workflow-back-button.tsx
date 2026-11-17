"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type WorkflowBackButtonProps = {
  guardUnsavedChanges: (action: () => void) => void;
};

export const WorkflowBackButton = ({ guardUnsavedChanges }: WorkflowBackButtonProps) => {
  const { t } = useTranslation("common");
  const router = useRouter();

  const goBack = () => {
    if (document.referrer.startsWith(window.location.origin)) router.back();
    else router.replace("/dashboard");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={t("workflowEditor.toolbar.back")}
      className="shrink-0 px-2"
      onClick={() => guardUnsavedChanges(goBack)}
    >
      <ArrowLeft aria-hidden="true" />
      <span className="hidden sm:inline">{t("workflowEditor.toolbar.back")}</span>
    </Button>
  );
};
