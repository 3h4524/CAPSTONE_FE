import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ONBOARDING_STEPS } from "@/constants/seller-dashboard";

/** The first steps for a Seller who has made nothing yet. */
export const OnboardingChecklist = () => (
  <Card>
    <CardHeader>
      <CardTitle>Start your first batch</CardTitle>
      <CardDescription>
        Four steps from a CSV to a listing ready for Etsy. Your dashboard fills in as you go.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ol className="divide-y">
        {ONBOARDING_STEPS.map((step, index) => (
          <li key={step.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-muted-foreground text-xs">{step.description}</p>
            </div>
            <Button variant={index === 0 ? "default" : "ghost"} size="sm" asChild>
              <Link href={step.href}>
                {index === 0 ? "Start" : "Open"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </li>
        ))}
      </ol>
    </CardContent>
  </Card>
);
