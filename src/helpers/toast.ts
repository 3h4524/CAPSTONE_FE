import type * as React from "react";
import type { ExternalToast, ToasterProps } from "sonner";
import { toast } from "sonner";

export const DEFAULT_DURATION_NOTIFICATION = 2000;
export const DEFAULT_POSITION_NOTIFICATION: ToasterProps["position"] = "top-right";

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
    "--normal-bg":
      "color-mix(in oklab, var(--color-yellow-600) 10%, var(--background))",
    "--normal-text": "var(--color-yellow-600)",
    "--normal-border": "var(--color-yellow-600)",
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
