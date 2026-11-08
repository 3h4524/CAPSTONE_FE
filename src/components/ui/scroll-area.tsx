"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";

import { cn } from "@/utils/cn";

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative flex flex-col overflow-hidden", className)} {...props}>
      {/* Flex, not h-full: a dialog that only sets max-height has no definite height for a percentage to resolve against. */}
      <ScrollAreaPrimitive.Viewport className="min-h-0 w-full flex-auto rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex touch-none p-px transition-colors select-none"
      >
        <ScrollAreaPrimitive.Thumb className="bg-border relative flex-1 rounded-full" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export { ScrollArea };
