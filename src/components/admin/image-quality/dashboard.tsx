"use client";

import { Activity, FlaskConical } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { EvaluationPanel } from "@/components/admin/image-quality/evaluation/evaluation-panel";
import { LivePanel } from "@/components/admin/image-quality/live/live-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ImageQualityDashboard = () => (
  <AdminShell pageTitle="Image Quality">
    <div className="relative flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          Design images before and after a prompt change
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-ink-600">
          <strong className="font-semibold text-ink-800">Evaluation runs</strong> hold the scores
          the offline scripts gave to images that already exist: text read back by OCR, layout, how
          closely the image follows the Seller&apos;s description, and technical quality.{" "}
          <strong className="font-semibold text-ink-800">Live generation stats</strong> come
          straight from the jobs in the database and update by themselves.
        </p>
      </header>

      <Tabs defaultValue="evaluation" className="gap-5">
        <TabsList className="h-11 w-full bg-ink-200/70 sm:w-fit">
          <TabsTrigger value="evaluation" className="px-5 text-sm">
            <FlaskConical />
            Evaluation runs
          </TabsTrigger>
          <TabsTrigger value="live" className="px-5 text-sm">
            <Activity />
            Live generation stats
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
