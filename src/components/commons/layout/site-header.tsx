"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/data/landing-content";
import { useNavigation } from "@/hooks/use-navigation";
import { cn } from "@/utils/cn";

export const SiteHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { handleNavClick, isItemActive } = useNavigation();

  const handleMobileNavClick = (item: (typeof NAV_LINKS)[number]) => {
    setIsMobileMenuOpen(false);
    handleNavClick(item);
  };

  return (
    <header className="bg-background/90 sticky top-0 z-50 border-b backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          APCS
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const isActive = isItemActive(link);
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavClick(link)}
                className={cn(
                  "cursor-pointer text-sm font-medium transition-colors focus-visible:underline focus-visible:outline-none",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </button>
            );
          })}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="login"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors focus-visible:underline focus-visible:outline-none"
          >
            Login
          </Link>
          <Button variant="defaultWithTextWhite" size="sm" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-display text-left">APCS</SheetTitle>
              <SheetDescription className="sr-only">Site navigation</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
              {NAV_LINKS.map((link) => {
                const isActive = isItemActive(link);
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleMobileNavClick(link)}
                    className={cn(
                      "focus-visible:ring-ring rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      isActive
                        ? "bg-muted text-primary font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </button>
                );
              })}
              <SheetClose asChild>
                <Link
                  href="login"
                  className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Login
                </Link>
              </SheetClose>
            </nav>
            <div className="mt-auto p-4">
              <SheetClose asChild>
                <Link
                  href="register"
                  className={buttonVariants({
                    variant: "defaultWithTextWhite",
                    className: "w-full",
                  })}
                >
                  Get Started
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
};
