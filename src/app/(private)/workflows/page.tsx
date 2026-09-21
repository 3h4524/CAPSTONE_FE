import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Workflows", description: "Manage product creation workflows." };

const WorkflowsPage = () => (
  <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
    <header>
      <p className="text-muted-foreground text-sm font-medium tracking-wide">AUTOMATION</p>
      <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">Workflows</h1>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
        Configure and monitor the processing steps that turn product inputs into finished assets.
      </p>
    </header>
    <Card className="gap-0 rounded-xl shadow-sm">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
          <Workflow className="size-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">Workflow management is coming soon</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Product batches are managed separately. Prepare and queue product inputs from the Batches page.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/batches">Open batches <ArrowRight className="ml-2 size-4" /></Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default WorkflowsPage;
