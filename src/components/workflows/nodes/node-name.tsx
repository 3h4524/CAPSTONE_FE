"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/utils/cn";

type NodeNameProps = {
  label: string;
  Icon: LucideIcon;
  iconClassName?: string;
};

export const NodeName = ({ label, Icon, iconClassName }: NodeNameProps) => (
  <div title={label} className="flex min-w-0 flex-1 items-center gap-1.5">
    <Icon className={cn("size-3.5 shrink-0", iconClassName)} aria-hidden="true" />
    <span className="min-w-0 truncate text-xs leading-5 font-semibold tracking-[-0.01em] text-slate-900">{label}</span>
  </div>
);
