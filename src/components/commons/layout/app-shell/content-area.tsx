"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type ContentAreaProps = {
  children: ReactNode;
};

// Pages whose own cards sit straight on the shell background, without the white page card.
const BARE_ROUTES = ["/subscription"];

export const ContentArea = ({ children }: ContentAreaProps) => {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`) === true);

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6">
      {isBare ? (
        <div className="mx-auto flex min-h-full w-full flex-col">{children}</div>
      ) : (
        <Card className="mx-auto flex min-h-full w-full flex-col gap-0 overflow-hidden rounded-xl py-0 shadow-sm">
          {children}
        </Card>
      )}
    </main>
  );
};
