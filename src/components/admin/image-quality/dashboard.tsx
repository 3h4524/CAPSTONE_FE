"use client";

import { useState } from "react";
import { Activity, ChevronDown, FlaskConical } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { EvaluationPanel } from "@/components/admin/image-quality/evaluation/evaluation-panel";
import { LivePanel } from "@/components/admin/image-quality/live/live-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

export const ImageQualityDashboard = () => {
  const isPhone = useIsPhone();
  // The introduction fills a phone's screen before any figure, so it opens on request there.
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  return (
    <AdminShell pageTitle="Image Quality">
      <div className="relative flex flex-col gap-6 max-md:gap-3">
        <header className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900 max-md:text-lg sm:text-2xl">
            Design images before and after a prompt change
          </h2>
          <p className={cn("max-w-3xl text-sm leading-relaxed text-ink-600", !isIntroOpen && "max-md:hidden")}>
            <strong className="font-semibold text-ink-800">Evaluation runs</strong> hold the scores
            the offline scripts gave to images that already exist: text read back by OCR, layout, how
            closely the image follows the Seller&apos;s description, and technical quality.{" "}
            <strong className="font-semibold text-ink-800">Live generation stats</strong> come
            straight from the jobs in the database and update by themselves.
          </p>
          <button
            type="button"
            aria-expanded={isIntroOpen}
            onClick={() => setIsIntroOpen((open) => !open)}
            className="inline-flex min-h-8 items-center gap-1 self-start text-xs font-semibold text-sky-700 md:hidden dark:text-sky-300"
          >
            {isIntroOpen ? "Hide" : "What is this?"}
            <ChevronDown className={cn("size-3 transition-transform", isIntroOpen && "rotate-180")} aria-hidden="true" />
          </button>
        </header>

        <Tabs defaultValue="evaluation" className="gap-5 max-md:gap-3">
          <TabsList className="h-11 w-full bg-ink-200/70 sm:w-fit">
            <TabsTrigger value="evaluation" className="px-5 text-sm max-md:px-2">
              <FlaskConical />
              {isPhone ? "Evaluation" : "Evaluation runs"}
            </TabsTrigger>
            <TabsTrigger value="live" className="px-5 text-sm max-md:px-2">
              <Activity />
              {isPhone ? "Live stats" : "Live generation stats"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="evaluation">
            <EvaluationPanel />
          </TabsContent>
          <TabsContent value="live">
            <LivePanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
};
