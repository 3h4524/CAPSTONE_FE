"use client";

import { Toaster } from "sonner";

import { DEFAULT_POSITION_NOTIFICATION } from "@/helpers/toast";

export function GlobalToast() {
  return (
    <Toaster
      position={DEFAULT_POSITION_NOTIFICATION}
      className="toaster group whitespace-pre-line"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
}
