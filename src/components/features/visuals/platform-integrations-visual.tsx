import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CONNECTED_PLATFORMS } from "@/data/features-content";

export const PlatformIntegrationsVisual = () => {
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3">
        {CONNECTED_PLATFORMS.map((platform) => (
          <div
            key={platform.name}
            className="border-border flex min-w-0 flex-col gap-2 rounded-lg border p-4 max-sm:p-3"
          >
            <platform.icon className="text-primary size-6" strokeWidth={1.75} />
            <p className="text-sm font-semibold">{platform.name}</p>
            <p className="text-muted-foreground text-xs">{platform.detail}</p>
            <Badge className="w-fit">
              <Check className="size-3" />
              Connected
            </Badge>
          </div>
        ))}
      </div>
      <div className="border-border flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
        <p className="text-muted-foreground text-sm">
          More marketplaces on the way
        </p>
        <Badge variant="outline">+ Connect</Badge>
      </div>
    </Card>
  );
};
