"use client";

import { Bell, ChevronDown, Command, Menu, Search } from "lucide-react";

type AdminTopbarProps = {
  fullName: string;
  onMenuClick: () => void;
};

const AdminTopbar = ({ fullName, onMenuClick }: AdminTopbarProps) => (
  <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8fafc]">
    <div className="flex h-[52px] items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 sm:px-7">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex items-center gap-2 text-[12px] font-medium tracking-[0.12em] text-slate-500 uppercase">
          <span>Admin</span>
          <span className="text-slate-300">/</span>
          <span className="text-[12px] font-medium tracking-normal text-slate-700 lowercase">
            Dashboard
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden h-8 w-52 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
          <Search className="size-3.5 text-slate-400" />
          <span className="flex-1 text-[10px] text-slate-400">Search workspace...</span>
          <span className="flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1 py-0.5 text-[9px] font-medium text-slate-400">
            <Command className="size-2.5" /> K
          </span>
        </div>

        <button
          type="button"
          className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="size-3.5" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rose-400" />
        </button>

        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <div className="flex size-6 items-center justify-center rounded-md bg-slate-900 text-[9px] font-bold text-white">
            AM
          </div>
          <span className="hidden text-[11px] font-medium text-slate-700 sm:inline">
            {fullName}
          </span>
          <ChevronDown className="size-3.5 text-slate-400" />
        </div>
      </div>
    </div>
  </header>
);

export { AdminTopbar };
