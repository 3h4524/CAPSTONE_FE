"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import type { HealthCheck } from "@/components/admin/admin-attention-panel";

type AdminHeroCardProps = {
  fullName: string;
  healthChecks: HealthCheck[];
  onOpenHealthCheck: () => void;
};
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

  return (
    <section className="group relative order-first flex h-full min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-ink-300 bg-linear-to-r from-ink-200 via-ink-200 to-ink-300 p-6 text-ink-900 shadow-sm dark:border-border dark:bg-card dark:bg-[radial-gradient(120%_140%_at_0%_0%,rgba(45,212,191,0.12),transparent_55%)] dark:shadow-none transition-shadow duration-300 hover:shadow-md max-md:min-h-0 max-md:p-4 md:order-none dark:md:justify-center">
      {/* Light: the whole product photo on the right. Dark: same layout as the seller hero, a
          full-height studio shot whose left edge dissolves into the card behind a scrim. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden max-w-[66%] items-center justify-end pr-3 md:flex xl:max-w-[70%] dark:w-[50%] dark:max-w-none dark:pr-0 dark:xl:max-w-none"
      >
        <div className="relative aspect-[1024/682] h-[92%] max-w-full translate-y-2 dark:aspect-auto dark:h-full dark:w-full dark:translate-y-0 dark:overflow-hidden">
          <Image
            src="/images/dashboard/hero-merch-v4.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 520px, 60vw"
            priority
            className="object-contain object-right transition-transform duration-500 group-hover:scale-[1.02] dark:hidden"
          />
          <Image
            src="/images/dashboard/hero-merch-dark.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 520px, 60vw"
            className="hidden object-cover object-center transition-transform duration-500 group-hover:scale-[1.02] dark:block"
          />
          <div className="from-card via-card/60 absolute inset-y-0 -left-px hidden w-2/5 bg-linear-to-r to-transparent dark:block" />
        </div>
      </div>

      {/* Text Info */}
      <div className="relative z-10 max-w-[56%] min-w-0 max-md:max-w-full dark:md:max-w-[48%]">
        <p className="text-xs font-semibold text-ink-900 dark:text-ink-500">{today()}</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900 max-md:text-xl">
          Welcome back, {firstName}
        </h2>
        <p className="mt-2 text-sm leading-snug text-ink-700">
          {describeAttention()}
        </p>
      </div>

      {/* Health Check Button */}
      <div className="relative z-10 mt-6 max-md:mt-3 dark:md:mt-5">
        <button
          type="button"
          onClick={onOpenHealthCheck}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:bg-ink-900 active:scale-95"
        >
          Health check
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};
