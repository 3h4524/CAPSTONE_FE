import { AccountMenu } from "@/components/private/app-shell/account/account-menu";
import { GlobalSearchTrigger } from "@/components/private/app-shell/header/global-search-trigger";
import { HeaderTitle } from "@/components/private/app-shell/header/header-title";
import { MobileMenuButton } from "@/components/private/app-shell/header/mobile-menu-button";
import { NewBatchButton } from "@/components/private/app-shell/header/new-batch-button";
import { NotificationBell } from "@/components/private/app-shell/notifications/notification-bell";
import { Separator } from "@/components/ui/separator";

type AppHeaderProps = {
  onMobileMenu: () => void;
};

export const AppHeader = ({ onMobileMenu }: AppHeaderProps) => {
  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="flex h-16 items-center gap-2 px-4 lg:px-6">
        <MobileMenuButton onClick={onMobileMenu} />
        <HeaderTitle />
        <div className="flex-1" />
        <GlobalSearchTrigger />
        <NotificationBell />
        <NewBatchButton />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="w-48 shrink-0">
          <AccountMenu collapsed={false} side="bottom" />
        </div>
      </div>
    </header>
  );
};
