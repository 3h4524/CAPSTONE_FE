"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

import { CardDescription } from "@/components/ui/card";
import { cn } from "@/utils/cn";

/** A card's explanation: always in view on larger screens, on request on a phone, where it would fill the screen. */
export const RagCardAbout = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <CardDescription className={cn("mt-1 max-w-3xl text-xs leading-5", !isOpen && "max-md:hidden")}>{children}</CardDescription>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="mt-1 inline-flex min-h-8 items-center gap-1 text-[11px] font-semibold text-indigo-600 md:hidden dark:text-indigo-400"
      >
        {isOpen ? "Hide" : "What is this?"}
        <ChevronDown className={cn("size-3 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
      </button>
    </>
  );
};
