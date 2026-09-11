import { GlobalSearchTrigger } from "@/components/private/app-shell/header/global-search-trigger";
import { HeaderTitle } from "@/components/private/app-shell/header/header-title";
import { MobileMenuButton } from "@/components/private/app-shell/header/mobile-menu-button";
import { NewBatchButton } from "@/components/private/app-shell/header/new-batch-button";
import { NotificationBell } from "@/components/private/app-shell/notifications/notification-bell";

type AppHeaderProps = {
  onMobileMenu: () => void;
};

export const AppHeader = ({ onMobileMenu }: AppHeaderProps) => {
  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
        <MobileMenuButton onClick={onMobileMenu} />
        <HeaderTitle />
        <div className="mx-auto hidden w-full max-w-lg flex-1 px-2 md:block">
          <GlobalSearchTrigger />
        </div>
        <NotificationBell />
        <NewBatchButton />
      </div>
    </header>
  );
};
