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

const MERCH_FADE = "linear-gradient(to right, transparent 0%, black 15%)";

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
    <section className="group relative flex h-full min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-[#cbd3dc] bg-linear-to-r from-[#e1e5ea] via-[#dfe3e8] to-[#dce2e7] p-6 text-slate-900 shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Merch Product Photo on the right side - fully visible, not cut off */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden sm:flex items-center justify-end max-w-[66%] xl:max-w-[70%] pr-3"
      >
        <div className="relative aspect-[1024/682] h-[92%] max-w-full translate-y-2">
          <Image
            src="/images/dashboard/hero-merch-v4.webp"
            alt=""
            fill
            sizes="(min-width: 1280px) 520px, 60vw"
            priority
            className="object-contain object-right transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </div>

      {/* Text Info */}
      <div className="relative z-10 max-w-[56%] min-w-0 max-sm:max-w-full">
        <p className="text-xs font-semibold text-slate-900">{today()}</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {firstName}
        </h2>
        <p className="mt-2 text-sm text-slate-700 leading-snug">
          {describeAttention()}
        </p>
      </div>

      {/* Health Check Button */}
      <div className="relative z-10 mt-6">
        <button
          type="button"
          onClick={onOpenHealthCheck}
          className="inline-flex items-center gap-2 rounded-full bg-[#1e293b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0f172a] hover:scale-105 active:scale-95 cursor-pointer"
        >
          Health check
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

