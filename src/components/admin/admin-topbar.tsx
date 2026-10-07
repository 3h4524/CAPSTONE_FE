"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/commons/layout/app-shell/notifications/notification-bell";

type AdminTopbarProps = {
  fullName: string;
  onMenuClick: () => void;
  pageTitle?: string;
};

const AdminTopbar = ({ onMenuClick, pageTitle = "Dashboard" }: AdminTopbarProps) => (
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
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">


        <NotificationBell />


      </div>
    </div>
  </header>
);

export { AdminTopbar };
