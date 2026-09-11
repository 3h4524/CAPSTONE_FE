"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NAV_SECTIONS } from "@/constants/navigation";
import { useLogout } from "@/hooks/mutations/use-logout";

import { NavSection } from "./nav-section";

type AppSidebarMobileProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
};

export const AppSidebarMobile = ({ open, onOpenChange }: AppSidebarMobileProps) => {
  const router = useRouter();
  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left">APCS</SheetTitle>
          <SheetDescription className="sr-only">Application navigation</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-4" aria-label="Mobile">
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.label} section={section} collapsed={false} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t p-4">
          <Button type="button" variant="ghost" className="justify-start" asChild>
            <Link href="/profile">
              <User />
              <span>Profile</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="justify-start"
            onClick={handleLogout}
            disabled={isPending}
          >
            <LogOut />
            <span>Log out</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
