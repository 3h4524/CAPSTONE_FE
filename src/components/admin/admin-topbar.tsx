"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/commons/icons/logo";
import { NotificationBell } from "@/components/commons/layout/app-shell/notifications/notification-bell";

type AdminTopbarProps = {
  fullName: string;
  onMenuClick: () => void;
  pageTitle?: string;
};

const AdminTopbar = ({ onMenuClick, pageTitle = "Dashboard" }: AdminTopbarProps) => (
  <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f8fafc]">
    <div className="flex h-[52px] items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-4 max-md:h-16 md:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/admin/dashboard" aria-label="Podivo admin, go to the dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
          <span aria-hidden="true" className="flex shrink-0">
            <Logo height={36} width={36} />
          </span>
          <span className="font-display truncate text-base font-bold tracking-tight">Podivo</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-500">ADMIN</span>
        </Link>
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 max-md:hidden lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" />
        </button>

        <div className="flex items-center gap-2 text-[12px] font-medium tracking-[0.12em] text-slate-500 uppercase max-md:hidden">
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
