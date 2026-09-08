import { Check, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LISTING_CHECKS, LISTING_TAGS } from "@/data/features-content";

export const ListingContentVisual = () => {
  return (
    <Card className="gap-4 p-5 shadow-lg" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          Vintage Sunset T-Shirt, Retro Graphic Tee, Gift for Him
        </p>
        <Badge className="shrink-0">
          <Gauge className="size-3" />
          SEO 92
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LISTING_TAGS.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
        <Badge variant="secondary">+ 7 more</Badge>
      </div>
      <ul className="flex flex-col gap-2 p-0">
        {LISTING_CHECKS.map((check) => (
          <li
            key={check}
            className="text-muted-foreground flex items-center gap-2 text-sm"
          >
            <Check className="size-4 shrink-0 text-emerald-600" />
            {check}
          </li>
        ))}
      </ul>
    </Card>
  );
};
