"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/commons/icons/logo";
import { NotificationBell } from "@/components/commons/layout/app-shell/notifications/notification-bell";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouteTitle } from "@/hooks/use-route-title";
import { useAdminShellStore } from "@/stores/admin-shell";

type AdminTopbarProps = {
  onMenuClick: () => void;
  pageTitle?: string;
};

const AdminTopbar = ({ onMenuClick, pageTitle }: AdminTopbarProps) => {
  const { t } = useTranslation("common");
  const { title, path, isNested } = useRouteTitle();
  const titleOverride = useAdminShellStore((state) => state.titleOverride);
  const crumbTitle = pageTitle ?? titleOverride ?? title;
  const isRouteLink = isNested && !pageTitle && !titleOverride && path !== null;

  return (
    <header className="border-ink-200 bg-ink-50 sticky top-0 z-20 border-b">
      <div className="border-ink-200 bg-card/80 flex h-[52px] items-center justify-between gap-4 border-b px-4 max-md:h-16 md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/dashboard" aria-label="Podivo admin, go to the dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
            <span aria-hidden="true" className="flex shrink-0">
              <Logo height={36} width={36} />
            </span>
            <span className="font-display truncate text-base font-bold tracking-tight">Podivo</span>
            <span className="bg-ink-100 text-ink-500 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide">ADMIN</span>
          </Link>
          <button
            type="button"
            onClick={onMenuClick}
            className="text-ink-500 hover:bg-ink-100 rounded-md p-1.5 max-md:hidden lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>

          <Breadcrumb aria-label={t("navigation.breadcrumb")} className="max-md:hidden">
            <BreadcrumbList className="text-[12px] font-medium">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/admin/dashboard">{t("navigation.admin.root")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {crumbTitle && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isRouteLink ? (
                      <BreadcrumbLink asChild>
                        <Link href={path}>{crumbTitle}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumbTitle}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">


          <NotificationBell />


        </div>
      </div>
    </header>
  );
};

export { AdminTopbar };
