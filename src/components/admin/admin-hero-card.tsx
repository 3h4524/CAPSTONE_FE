"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { HealthCheck } from "@/components/admin/admin-attention-panel";
import { HERO_PRIMARY_ACTION } from "@/components/commons/layout/merch-hero";

type AdminHeroCardProps = {
  fullName: string;
  healthChecks: HealthCheck[];
  onOpenHealthCheck: () => void;
};

// The Seller hero's photo treatment, fitted to this taller, narrower card. Light: the photo sits in the
// bottom-right corner at its own proportions (nothing cropped) and fades in from the left and from the
// top, so the greeting above stays clear. Dark: like the Seller hero, the studio shot fills the right
// half at full height behind a card-coloured scrim.
const ADMIN_MERCH_FRAME =
  "[mask-image:linear-gradient(to_right,transparent_0%,black_15%),linear-gradient(to_bottom,transparent_0%,black_18%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_15%),linear-gradient(to_bottom,transparent_0%,black_18%)] [mask-composite:intersect] [-webkit-mask-composite:source-in] dark:top-0 dark:aspect-auto dark:w-[50%] dark:overflow-hidden dark:[mask-image:none] dark:[-webkit-mask-image:none]";

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

const getFirstName = (fullName?: string | null): string => {
  if (!fullName) return "Admin";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? "Admin";
};

export const AdminHeroCard = ({
  fullName,
  healthChecks,
  onOpenHealthCheck,
}: AdminHeroCardProps) => {
  const firstName = getFirstName(fullName);
  const issues = healthChecks.filter((check) => check.status !== "ok");

  const describeAttention = () => {
    if (issues.length === 0) {
      return "All platform systems and integrations are healthy.";
    }
    if (issues.length === 1) {
      return `${issues[0].label} needs attention.`;
    }
    const topTwo = issues.slice(0, 2).map((item) => item.label).join(" and ");
    return `${topTwo} need attention.`;
  };

  // Same build as the Seller dashboard hero (dashboard-hero.tsx): the card gradient, a one-line greeting
  // and the soft pill action; only the photo frame is fitted to this card's shape (ADMIN_MERCH_FRAME).
  return (
    <section className="group border-ink-300 from-ink-200 via-ink-300 to-ink-300 text-ink-900 dark:border-border dark:bg-card relative order-first flex h-full min-h-52 flex-col justify-between overflow-hidden rounded-2xl border bg-linear-to-r p-6 shadow-sm transition-shadow duration-300 hover:shadow-md max-md:p-5 md:order-none dark:bg-[radial-gradient(120%_140%_at_0%_0%,rgba(45,212,191,0.12),transparent_55%)] dark:shadow-none dark:md:justify-center">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute right-0 bottom-0 hidden aspect-[1024/682] w-[66%] md:block ${ADMIN_MERCH_FRAME}`}
      >
        <Image
          src="/images/dashboard/hero-merch-v4.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 460px, 60vw"
          priority
          className="object-cover object-bottom-right transition-transform duration-700 group-hover:scale-[1.03] dark:hidden"
        />
        <Image
          src="/images/dashboard/hero-merch-dark.webp"
          alt=""
          fill
          sizes="(min-width: 1280px) 460px, 60vw"
          className="hidden object-cover object-center transition-transform duration-700 group-hover:scale-[1.03] dark:block"
        />
        <div className="from-card via-card/60 absolute inset-y-0 -left-px hidden w-2/5 bg-linear-to-r to-transparent dark:block" />
      </div>

      <div className="relative z-10 max-w-[55%] min-w-0 max-md:max-w-full dark:md:max-w-[48%]">
        <p className="text-ink-900 dark:text-ink-500 text-xs font-semibold">{today()}</p>
        <h2 className="text-ink-900 mt-1 truncate text-2xl font-bold tracking-tight" title={fullName}>
          Welcome back, {firstName}
        </h2>
        <p className="text-ink-700 mt-1 text-sm">{describeAttention()}</p>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium max-md:mt-4 dark:md:mt-5">
        <button type="button" onClick={onOpenHealthCheck} className={`${HERO_PRIMARY_ACTION} cursor-pointer`}>
          Health check
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
