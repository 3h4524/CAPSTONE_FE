"use client";

import { Bell, ChevronDown, Command, Menu, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

type AdminTopbarProps = {
  fullName: string;
  onMenuClick: () => void;
};

const AdminTopbar = ({ fullName, onMenuClick }: AdminTopbarProps) => (
  <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-50 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>
      <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
        <span>Admin</span>
        <span>/</span>
        <span className="font-medium text-slate-700">Dashboard</span>
      </div>
    </div>

    <div className="flex items-center gap-2 sm:gap-4">
      <div className="hidden h-8 w-56 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
        <Search className="size-3.5 text-slate-400" />
        <span className="flex-1 text-[10px] text-slate-400">Search workspace...</span>
        <span className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-medium text-slate-400">
          <Command className="size-2.5" /> K
        </span>
      </div>
      <button
        type="button"
        className="relative rounded-md p-2 text-slate-400 hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-400" />
      </button>
      <Button className="hidden h-8 rounded-md px-3 text-[10px] sm:inline-flex" size="sm">
        <SlidersHorizontal className="size-3" />
        Export Report
      </Button>
      <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-slate-900 text-[9px] font-bold text-white">
          AM
        </div>
        <span className="hidden text-xs font-semibold text-slate-700 sm:inline">{fullName}</span>
        <ChevronDown className="size-3.5 text-slate-400" />
      </div>
    </div>
  </header>
);

export { AdminTopbar };
