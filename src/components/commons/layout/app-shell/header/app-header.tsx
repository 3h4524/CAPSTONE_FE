import { AccountMenu } from "@/components/commons/layout/app-shell/account/account-menu";
import { GlobalSearchTrigger } from "@/components/commons/layout/app-shell/header/global-search-trigger";
import { HeaderTitle } from "@/components/commons/layout/app-shell/header/header-title";
import { MobileMenuButton } from "@/components/commons/layout/app-shell/header/mobile-menu-button";
import { NotificationBell } from "@/components/commons/layout/app-shell/notifications/notification-bell";

type AppHeaderProps = {
  onMobileMenu: () => void;
};

export const AppHeader = ({ onMobileMenu }: AppHeaderProps) => {
  return (
    <header className="bg-card dark:bg-background dark:lg:bg-panel sticky top-0 z-30 border-b">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
        <MobileMenuButton onClick={onMobileMenu} />
        <HeaderTitle />
        <div className="mx-auto hidden w-full max-w-lg min-w-0 flex-1 px-2 md:block">
          <GlobalSearchTrigger />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <NotificationBell />
          <div className="min-w-0 md:hidden">
            <AccountMenu collapsed side="bottom" inHeader />
          </div>
        </div>
      </div>
    </header>
  );
};
