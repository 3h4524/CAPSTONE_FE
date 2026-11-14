"use client";

import { useState } from "react";
import { Activity, ChevronDown, FlaskConical } from "lucide-react";

import { EvaluationPanel } from "@/components/admin/image-quality/evaluation/evaluation-panel";
import { LivePanel } from "@/components/admin/image-quality/live/live-panel";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

export const ImageQualityDashboard = () => {
  const isPhone = useIsPhone();
  // The introduction fills a phone's screen before any figure, so it opens on request there.
  const [isIntroOpen, setIsIntroOpen] = useState(false);

  return (
    <div className="relative flex flex-col gap-6 max-md:gap-3">
      <div className="flex flex-col gap-1.5">
        <PageHeader title="Design images before and after a prompt change" />
        <p className={cn("text-ink-600 max-w-3xl text-sm leading-relaxed", !isIntroOpen && "max-md:hidden")}>
          <strong className="text-ink-800 font-semibold">Evaluation runs</strong> hold the scores
          the offline scripts gave to images that already exist: text read back by OCR, layout, how
          closely the image follows the Seller&apos;s description, and technical quality.{" "}
          <strong className="text-ink-800 font-semibold">Live generation stats</strong> come
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
      </div>

      <Tabs defaultValue="evaluation" className="gap-5 max-md:gap-3">
        <TabsList className="bg-ink-200/70 h-11 w-full sm:w-fit">
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
  );
};
