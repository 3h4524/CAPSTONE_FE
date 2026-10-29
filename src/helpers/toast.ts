import type * as React from "react";
import type { ExternalToast, ToasterProps } from "sonner";
import { toast } from "sonner";

export const DEFAULT_DURATION_NOTIFICATION = 2000;
export const DEFAULT_POSITION_NOTIFICATION: ToasterProps["position"] = "top-right";
export const WORKFLOW_ACTION_TOAST_OPTIONS: Omit<ExternalToast, "style"> = {
  position: "bottom-center",
};

export type AlertType = "success" | "info" | "warning" | "error";

const TOAST_STYLES: Record<AlertType, React.CSSProperties> = {
  success: {
    "--normal-bg":
      "color-mix(in oklab, var(--color-green-600) 10%, var(--background))",
    "--normal-text": "var(--color-green-600)",
    "--normal-border": "var(--color-green-600)",
  } as React.CSSProperties,
  error: {
    "--normal-bg":
      "color-mix(in oklab, var(--color-red-600) 10%, var(--background))",
    "--normal-text": "var(--color-red-600)",
    "--normal-border": "var(--color-red-600)",
  } as React.CSSProperties,
  warning: {
    "--normal-bg": "var(--warning)",
    "--normal-text": "var(--warning-foreground)",
    "--normal-border":
      "color-mix(in oklab, var(--warning-foreground) 32%, var(--warning))",
  } as React.CSSProperties,
  info: {
    "--normal-bg":
      "color-mix(in oklab, var(--color-blue-600) 10%, var(--background))",
    "--normal-text": "var(--color-blue-600)",
    "--normal-border": "var(--color-blue-600)",
  } as React.CSSProperties,
};

export function showToast(
  type: AlertType,
  message: string,
  options?: Omit<ExternalToast, "style">
) {
  toast[type](message, {
    position: DEFAULT_POSITION_NOTIFICATION,
    duration: DEFAULT_DURATION_NOTIFICATION,
    style: TOAST_STYLES[type],
    ...options,
  });
}

export function showWorkflowActionToast(type: AlertType, message: string) {
  showToast(type, message, WORKFLOW_ACTION_TOAST_OPTIONS);
}
