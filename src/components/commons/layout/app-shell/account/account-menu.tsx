"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";

type AccountMenuProps = {
  collapsed: boolean;
  side?: "top" | "bottom";
};

export const AccountMenu = ({ collapsed, side = "top" }: AccountMenuProps) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

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
                  <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
                </>
              ) : (
                <Spinner className="size-4" aria-label="Loading account" />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isPending}>
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
