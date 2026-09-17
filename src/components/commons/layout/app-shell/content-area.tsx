"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type ContentAreaProps = {
  children: ReactNode;
};

export const ContentArea = ({ children }: ContentAreaProps) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6">
      <Card className="mx-auto flex min-h-full w-full flex-col gap-0 overflow-hidden rounded-xl py-0 shadow-sm">
        {children}
      </Card>
    </main>
  );
};
