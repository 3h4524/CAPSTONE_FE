import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TrialOfferCardProps = {
  trialDays: number;
  isStarting: boolean;
  onStart: () => void;
};

export const TrialOfferCard = ({ trialDays, isStarting, onStart }: TrialOfferCardProps) => (
  <Card className="border-primary/40 bg-primary/5">
    <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">Try Pro free for {trialDays} days</h3>
          <p className="text-muted-foreground text-sm">
            Pro&apos;s tools with standard videos: up to 10 products, 100 mockups, 10 videos and 20 listings.
            Connect your Gemini API key first. No payment needed. When the trial ends you go back to
            Free and keep everything you made.
          </p>
        </div>
      </div>
      <Button className="shrink-0" onClick={onStart} disabled={isStarting}>
        {isStarting ? "Starting…" : "Start free trial"}
      </Button>
    </CardContent>
  </Card>
);
