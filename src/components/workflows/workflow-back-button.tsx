"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePopupStore } from "@/stores/popup";
import { useWorkflowStore } from "@/stores/workflow";

export const WorkflowBackButton = () => {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.replace("/dashboard");
  };

  const requestBack = () => {
    if (!useWorkflowStore.getState().isDirty) {
      goBack();
      return;
    }
    usePopupStore.getState().openPopup({
      title: "Discard unsaved changes?",
      description: "Your latest edits to this workflow have not been saved yet.",
      positiveLabel: "Discard changes",
      negativeLabel: "Keep editing",
      onPositive: goBack,
    });
  };

  return (
    <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2" onClick={requestBack}>
      <ArrowLeft aria-hidden="true" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
};
