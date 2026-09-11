"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, User } from "lucide-react";

import { UserAvatar } from "@/components/commons/layout/app-shell/account/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useUserStore } from "@/stores/user";
import { cn } from "@/utils/cn";

type AccountMenuProps = {
  collapsed: boolean;
  side?: "top" | "bottom";
};

export const AccountMenu = ({ collapsed, side = "top" }: AccountMenuProps) => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () =>
    logout(undefined, {
      onSuccess: () => router.replace("/login"),
      onError: () => router.replace("/login"),
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Account"
          title={user?.fullName ?? "Account"}
          className={cn(
            "h-auto w-full items-center gap-2.5 rounded-lg p-2 text-left",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          <UserAvatar />
          {!collapsed && (
            <span className="hidden min-w-0 flex-1 sm:block">
              {user ? (
                <>
                  <span className="block truncate text-sm font-medium">{user.fullName}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {user.email}
                  </span>
                </>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side} className="w-56">
        <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
          {user?.email ?? ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <KeyRound />
          <span>API Keys</span>
          <span className="text-muted-foreground ml-auto text-xs">Coming soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isPending}>
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
