"use client";

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

export const SiteHeader = () => {
  return (
    <header className="bg-background/90 sticky top-0 z-50 border-b backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          APCS
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors focus-visible:underline focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <a
            href="#"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors focus-visible:underline focus-visible:outline-none"
          >
            Login
          </a>
          <Button variant="defaultWithTextWhite" size="sm" asChild>
            <a href="#signup">Get Started</a>
          </Button>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle className="font-display text-left">APCS</SheetTitle>
              <SheetDescription className="sr-only">
                Site navigation
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <SheetClose key={link.href} asChild>
                  <a
                    href={link.href}
                    className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
              <SheetClose asChild>
                <a
                  href="#"
                  className="hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Login
                </a>
              </SheetClose>
            </nav>
            <div className="mt-auto p-4">
              <SheetClose asChild>
                <a
                  href="#signup"
                  className={buttonVariants({
                    variant: "defaultWithTextWhite",
                    className: "w-full",
                  })}
                >
                  Get Started
                </a>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
};
