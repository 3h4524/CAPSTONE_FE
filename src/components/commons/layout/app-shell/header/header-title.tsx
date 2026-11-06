"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTE_TITLES } from "@/constants/navigation";
import { capitalize } from "@/helpers/text";

const isTitleKey = (value: string): value is keyof typeof ROUTE_TITLES => value in ROUTE_TITLES;

export const HeaderTitle = () => {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const title = isTitleKey(segment) ? ROUTE_TITLES[segment] : capitalize(segment) || "Dashboard";

  // On a phone the header is the brand and leads home; the page's name stays for screen readers.
  return (
    <>
      <Link href="/dashboard" aria-label="APCS, go to the dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
        <span
          aria-hidden="true"
          className="bg-primary text-primary-foreground font-display flex size-9 shrink-0 items-center justify-center rounded-xl text-base font-bold"
        >
          A
        </span>
        <span className="font-display truncate text-base font-bold tracking-tight">APCS</span>
      </Link>
      <h1 className="min-w-0 truncate text-base font-semibold max-md:sr-only">{title}</h1>
    </>
  );
};
