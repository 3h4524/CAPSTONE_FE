"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, User } from "lucide-react";

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
import { getResponseStatus } from "@/helpers/response-status";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useProfile } from "@/hooks/queries/use-profile";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";

type AccountMenuProps = {
  collapsed: boolean;
  side?: "top" | "bottom";
  /** The phone header has no sidebar beside it, so the menu also leads to Billing. */
  inHeader?: boolean;
};

export const AccountMenu = ({ collapsed, side = "top", inHeader = false }: AccountMenuProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
  const clearSession = useAuthStore((state) => state.clearSession);
  const profileQuery = useProfile(open);
  const { mutate: logout, isPending } = useLogout();

  useEffect(() => {
    if (profileQuery.data) setAvatarUrl(profileQuery.data.avatarUrl);
  }, [profileQuery.data, setAvatarUrl]);

  useEffect(() => {
    if (profileQuery.isError && getResponseStatus(profileQuery.error) === 401) {
      clearSession();
    }
  }, [clearSession, profileQuery.error, profileQuery.isError]);

  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "";

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Account"
          title={user?.fullName ?? "Account"}
          className={cn(
            "h-auto w-full items-center gap-2.5 rounded-lg p-2 text-left",
            collapsed ? "justify-center" : "justify-start",
            inHeader && "w-auto max-w-36 gap-2 rounded-full border p-1 pr-3 [@media(pointer:coarse)]:min-h-10"
          )}
        >
          <UserAvatar accent={inHeader} className={cn(inHeader && "size-7")} />
          {inHeader && <span className="min-w-0 truncate text-sm font-semibold">{firstName}</span>}
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
        <DropdownMenuItem asChild className="focus:bg-muted focus:text-primary">
          <Link href="/profile">
            <User />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        {inHeader && (
          <DropdownMenuItem asChild className="focus:bg-muted focus:text-primary">
            <Link href="/subscription">
              <CreditCard />
              <span>Billing</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="focus:bg-muted focus:text-primary" onClick={handleLogout} disabled={isPending}>
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
