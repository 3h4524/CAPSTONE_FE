"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

type ContentAreaProps = {
  children: ReactNode;
};

// Pages whose own cards sit straight on the shell background, without the white page card.
const BARE_ROUTES = ["/subscription"];
// The same on phones only, where these pages need the page card's width for their own cards.
const BARE_ON_PHONE_ROUTES = ["/dashboard", "/batches", "/styles"];

export const ContentArea = ({ children }: ContentAreaProps) => {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`) === true);

  const isBareOnPhone = BARE_ON_PHONE_ROUTES.includes(pathname ?? "");

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6">
      {isBare ? (
        <div className="mx-auto flex min-h-full w-full flex-col">{children}</div>
      ) : (
        <Card
          className={cn(
            "mx-auto flex min-h-full w-full flex-col gap-0 overflow-hidden rounded-xl py-0 shadow-sm",
            isBareOnPhone && "max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none"
          )}
        >
          {children}
        </Card>
      )}
    </main>
  );
};
