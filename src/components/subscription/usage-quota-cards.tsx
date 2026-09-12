import { HardDrive, ImageIcon, Zap } from "lucide-react";
import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UsageQuota } from "@/types/subscription";

const QUOTA_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  image_generation: ImageIcon,
  api_calls: Zap,
  storage: HardDrive,
};

type UsageQuotaCardsProps = {
  quotas: UsageQuota[];
};

export const UsageQuotaCards = ({ quotas }: UsageQuotaCardsProps) => {
  if (quotas.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {quotas.map((quota) => {
        const Icon = QUOTA_ICONS[quota.quotaCode] ?? ImageIcon;
        return (
          <Card key={quota.quotaCode}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {quota.used.toLocaleString()} / {quota.limit.toLocaleString()}
                  </p>
                  <p className="text-muted-foreground text-xs">{quota.label}</p>
                </div>
              </div>
              <Progress
                value={quota.percentUsed}
                indicatorClassName={quota.isWarning ? "bg-destructive" : undefined}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
