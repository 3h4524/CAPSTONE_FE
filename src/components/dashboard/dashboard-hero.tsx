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

// Light: the product photo fades in from the left so its pale backdrop melts into the card.
// Dark: the studio shot fills the whole right half, full card height, and a card-coloured scrim
// on its left edge dissolves it into the dark surface (a mask would expose a grey smear instead).
const MERCH_FRAME =
  "[mask-image:linear-gradient(to_right,transparent_0%,black_15%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_15%)] dark:aspect-auto dark:w-[50%] dark:max-w-none dark:overflow-hidden dark:[mask-image:none] dark:[-webkit-mask-image:none]";

// The one action as a soft pill with dark text: clear on the card, easy on the eye.
// Dark: the brand-blue pill, like the other primary actions.
const PRIMARY_ACTION =
  "inline-flex items-center gap-1.5 max-sm:w-full max-sm:justify-center rounded-full bg-card px-4 py-2 text-ink-900 shadow-sm ring-1 ring-ink-300 backdrop-blur transition hover:-translate-y-0.5 hover:bg-ink-50 hover:shadow-md dark:bg-primary dark:text-primary-foreground dark:ring-0 dark:hover:bg-primary/90";

// What Sellers make, shown on phones where the wide product photo has no room.
const MERCH_TILES = [
  { label: "Plate", src: "/images/dashboard/merch-plate.webp" },
  { label: "Satchel", src: "/images/dashboard/merch-satchel.webp" },
  { label: "Floral Tee", src: "/images/dashboard/merch-tee.webp" },
  { label: "Cap", src: "/images/dashboard/merch-cap.webp" },
  { label: "Ceramic Mug", src: "/images/dashboard/merch-mug.webp" },
];

/** The welcome card: who is signed in, what needs them today, and the one next step. */
export const DashboardHero = ({ items, onOpenActions }: DashboardHeroProps) => {
  const fullName = useAuthStore((state) => state.user?.fullName);
  const firstName = getFirstName(fullName);

  return (
    <section className="group max-sm:border-border max-sm:bg-card dark:bg-card border-ink-300 from-ink-200 via-ink-300 to-ink-300 text-ink-900 dark:border-border relative flex h-full min-h-52 flex-col justify-between overflow-hidden rounded-2xl border bg-linear-to-r p-6 shadow-sm transition-shadow duration-300 hover:shadow-md max-sm:bg-none max-sm:p-5 dark:bg-[radial-gradient(120%_140%_at_0%_0%,rgba(45,212,191,0.12),transparent_55%)] dark:shadow-none dark:sm:justify-center">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 hidden aspect-[1024/682] max-w-[62%] sm:block ${MERCH_FRAME}`}
      >
        <Image
          src="/images/dashboard/hero-merch-v4.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 460px, 60vw"
          priority
          className="object-cover object-right transition-transform duration-700 group-hover:scale-[1.03] dark:hidden"
        />
        {/* Dark-mode art: a studio shot on a cool backdrop that sits well inside the dark frame. */}
        <Image
          src="/images/dashboard/hero-merch-dark.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 460px, 60vw"
          className="hidden object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] dark:block"
        />
        <div className="from-card via-card/60 absolute inset-y-0 -left-px hidden w-2/5 bg-linear-to-r to-transparent dark:block" />
      </div>

      <div className="relative z-10 max-w-[55%] min-w-0 max-sm:max-w-full dark:sm:max-w-[48%]">
        <p className="text-ink-900 max-sm:text-ink-500 dark:text-ink-500 text-xs font-semibold max-sm:text-[11px] max-sm:tracking-wider max-sm:uppercase">{today()}</p>
        <h1
          className="text-ink-900 mt-1 truncate text-2xl font-bold tracking-tight"
          title={fullName ?? undefined}
        >
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-ink-700 mt-1 text-sm">{describeGreeting(items)}</p>
      </div>

      <ul className="bg-muted/40 ring-ink-200 relative z-10 mt-4 grid grid-cols-5 gap-1.5 rounded-xl p-2 ring-1 sm:hidden">
        {MERCH_TILES.map(({ label, src }) => (
          <li key={label} className="min-w-0 text-center">
            <Image src={src} alt="" width={56} height={56} className="mx-auto aspect-square w-full max-w-14 rounded-lg object-cover" />
            <span className="text-ink-700 mt-1 block text-[10px] leading-tight font-medium">{label}</span>
          </li>
        ))}
      </ul>

      {/* Dark: the actions stack under the greeting as one left-aligned group, clear of the photo. */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium max-sm:mt-4 dark:sm:mt-5 dark:sm:max-w-[48%] dark:sm:flex-col dark:sm:items-start dark:sm:gap-y-3">
        {items.length > 0 ? (
          <button type="button" onClick={onOpenActions} className={PRIMARY_ACTION}>
            See what needs you
            <span className="bg-ink-100 text-ink-700 dark:text-primary-foreground rounded-full px-1.5 text-[11px] font-semibold tabular-nums dark:bg-black/10">
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
          className="text-ink-900 dark:text-ink-700 dark:hover:text-foreground inline-flex items-center gap-1.5 transition hover:text-black max-sm:min-h-10 max-sm:w-full max-sm:justify-center"
        >
          <Compass className="size-4" aria-hidden="true" />
          Find a niche in Market Radar
        </Link>
      </div>
    </section>
  );
};
