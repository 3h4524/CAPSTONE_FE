"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { describeGreeting } from "@/helpers/seller-dashboard";
import { useAuthStore } from "@/stores/auth";
import type { ActionItem } from "@/types/seller-dashboard";

type DashboardHeroProps = {
  items: ActionItem[];
  activeBatchCount: number;
  /** Opens the drawer listing what waits on the Seller. */
  onOpenActions: () => void;
};

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

/** Extracts the first/given name so greetings remain concise and never get truncated. */
const getFirstName = (fullName?: string | null): string => {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? "";
};

// The product photo fades in from the left so its clean backdrop melts into the card's.
const MERCH_FADE = "linear-gradient(to right, transparent 0%, black 15%)";

// The one action as a soft pill with dark text: clear on the card, easy on the eye.
const PRIMARY_ACTION =
  "inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-slate-900 shadow-sm ring-1 ring-slate-300 backdrop-blur transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md";

/** The welcome card: who is signed in, what needs them today, and the one next step. */
export const DashboardHero = ({ items, onOpenActions }: DashboardHeroProps) => {
  const fullName = useAuthStore((state) => state.user?.fullName);
  const firstName = getFirstName(fullName);

  return (
    <section className="group relative flex h-full min-h-52 flex-col justify-between overflow-hidden rounded-2xl border border-[#cbd3dc] bg-linear-to-r from-[#e3e7ec] via-[#dde2e8] to-[#dbe0e6] p-6 text-slate-900 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden aspect-[1024/682] max-w-[62%] sm:block"
        style={{ maskImage: MERCH_FADE, WebkitMaskImage: MERCH_FADE }}
      >
        <Image
          src="/images/dashboard/hero-merch-v4.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 460px, 60vw"
          priority
          className="object-cover object-right transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>

      <div className="relative z-10 max-w-[55%] min-w-0 max-sm:max-w-full">
        <p className="text-xs font-semibold text-slate-900">{today()}</p>
        <h1
          className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900"
          title={fullName ?? undefined}
        >
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-slate-700">{describeGreeting(items)}</p>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
        {items.length > 0 ? (
          <button type="button" onClick={onOpenActions} className={PRIMARY_ACTION}>
            See what needs you
            <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-700 tabular-nums">
              {items.length}
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <Link href="/workflows" className={PRIMARY_ACTION}>
            Start a new batch
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
        <Link
          href="/market-opportunities"
          className="inline-flex items-center gap-1.5 text-slate-900 transition hover:text-black"
        >
          <Compass className="size-4" aria-hidden="true" />
          Find a niche in Market Radar
        </Link>
      </div>
    </section>
  );
};
