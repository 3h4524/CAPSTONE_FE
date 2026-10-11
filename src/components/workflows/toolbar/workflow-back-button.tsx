"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type WorkflowBackButtonProps = {
  guardUnsavedChanges: (action: () => void) => void;
};

export const WorkflowBackButton = ({ guardUnsavedChanges }: WorkflowBackButtonProps) => {
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
      aria-label="Back"
      className="shrink-0 px-2"
      onClick={() => guardUnsavedChanges(goBack)}
    >
      <ArrowLeft aria-hidden="true" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
};
