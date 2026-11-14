import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export const DIALOG_CLASS =
  "bg-card flex max-h-[calc(100dvh-20px)] w-[calc(100%-20px)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-[24px] border-0 p-0 shadow-[0_28px_80px_rgba(15,23,42,0.28)]";

export const DialogHead = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  onClose,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: ReactNode;
  onClose: () => void;
}) => (
  <DialogHeader className="relative flex-row items-start gap-3 px-5 pt-6 pr-16 pb-3 text-left sm:px-6">
    <div className="text-primary bg-ink-100 flex size-10 shrink-0 items-center justify-center rounded-xl">
      <Icon className="size-[18px]" aria-hidden="true" />
    </div>
    <div className="min-w-0 space-y-1">
      <p className="text-ink-500 text-[10px] font-bold tracking-[0.16em]">{eyebrow}</p>
      <DialogTitle className="font-display truncate text-xl tracking-[-0.02em]">{title}</DialogTitle>
      <DialogDescription className="leading-5">{description}</DialogDescription>
    </div>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-ink-500 hover:bg-ink-100 absolute top-4 right-4 size-10 rounded-lg hover:translate-y-0"
      onClick={onClose}
      aria-label="Close"
    >
      <X aria-hidden="true" />
    </Button>
  </DialogHeader>
);

export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="text-ink-700 text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && !error ? <p className="text-ink-500 text-xs leading-relaxed">{hint}</p> : null}
    {error ? (
      <p role="alert" className="text-destructive text-xs">
        {error}
      </p>
    ) : null}
  </div>
);

export const SwitchRow = ({
  id,
  title,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  hint: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3">
    <div>
      <label htmlFor={id} className="text-ink-700 text-sm font-medium">
        {title}
      </label>
      <p className="text-ink-500 text-xs leading-relaxed">{hint}</p>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);
