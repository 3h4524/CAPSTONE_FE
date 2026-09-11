"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type ContentAreaProps = {
  children: ReactNode;
};

export const ContentArea = ({ children }: ContentAreaProps) => {
  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-6">
      <Card className="mx-auto flex min-h-full w-full max-w-6xl flex-col rounded-xl shadow-sm">
        {children}
      </Card>
    </main>
  );
};
