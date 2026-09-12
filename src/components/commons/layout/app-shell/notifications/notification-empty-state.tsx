"use client";

import { BellOff } from "lucide-react";

export const NotificationEmptyState = () => {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <BellOff className="text-muted-foreground size-8" />
      <p className="text-sm font-medium">You&apos;re all caught up</p>
      <p className="text-muted-foreground text-xs">
        Job updates and alerts will appear here.
      </p>
    </div>
  );
};
