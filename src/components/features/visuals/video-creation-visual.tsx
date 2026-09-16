import { Clapperboard, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const VideoCreationVisual = () => {
  return (
    <Card className="gap-4 overflow-hidden p-0 shadow-lg" aria-hidden="true">
      <div className="from-primary via-primary/80 to-secondary relative flex aspect-video flex-col justify-between bg-gradient-to-br p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge className="bg-white/15 text-white">Etsy video</Badge>
          <Badge className="bg-white/15 text-white">0:24</Badge>
        </div>
        <div className="flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="text-primary size-6 fill-current" />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className="block h-full w-2/3 rounded-full bg-white" />
          </span>
          <span className="text-xs font-medium text-white">0:16 / 0:24</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-5 pt-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Clapperboard className="text-primary size-4" />
          sunset-tee-promo.mp4
        </p>
        <Badge variant="outline">9:16 cut included</Badge>
      </div>
    </Card>
  );
};
