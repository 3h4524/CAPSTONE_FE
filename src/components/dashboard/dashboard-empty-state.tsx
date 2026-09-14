"use client";

import Link from "next/link";
import { Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DashboardEmptyState = () => {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Workflow className="text-muted-foreground size-7" />
      </span>
      <h2 className="text-xl font-semibold">Start your first batch</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Import a CSV, generate AI designs, render video, and publish an Etsy listing.
      </p>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button type="button" disabled>
                Create workflow
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
        <Button type="button" variant="ghost" asChild>
          <Link href="/features">View docs</Link>
        </Button>
      </div>
    </div>
  );
};
