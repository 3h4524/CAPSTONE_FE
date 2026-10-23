"use client";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MockupAsset, ScenePlan } from "@/types/video-workflow";

export const VideoSceneCard = ({ scene, asset }: { scene: ScenePlan; asset?: MockupAsset }) => <Card className="overflow-hidden">
  <CardContent className={`grid gap-4 p-4 sm:items-start ${asset ? "grid-cols-[6rem_minmax(0,1fr)] sm:grid-cols-[9rem_minmax(0,1fr)]" : ""}`}>
    {asset && <div className="bg-muted/55 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg p-2 sm:w-36">
      <Image src={asset.previewUrl} alt={`Source frame for scene ${scene.sceneOrder + 1}`} width={asset.width} height={asset.height} unoptimized className="size-full object-contain" />
    </div>}
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{scene.generationStrategy === "ai_shot" ? "AI video" : "Standard"}</Badge>
          <h3 className="text-sm font-semibold">Scene {scene.sceneOrder + 1}</h3>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">{(scene.durationFrames / 30).toFixed(1)} seconds</span>
      </div>

      <div className="space-y-1">
        {scene.aiTemplateCode && <p className="text-sm font-medium capitalize">{scene.aiTemplateCode.replaceAll("_", " ")}</p>}
        <p className="text-muted-foreground text-xs">{scene.role} · source revision {scene.sourceRevision}</p>
      </div>

      {scene.aiTemplateCode && <div className="flex flex-wrap gap-2" aria-label="Scene generation settings">
        {scene.aiSettings?.cameraMovement && <Badge variant="outline" className="font-normal">Camera · {scene.aiSettings.cameraMovement.replaceAll("_", " ")}</Badge>}
        {scene.aiSettings?.lighting && <Badge variant="outline" className="font-normal">{scene.aiSettings.lighting.replaceAll("_", " ")}</Badge>}
        {scene.transition && <Badge variant="outline" className="font-normal">Transition · {scene.transition}</Badge>}
      </div>}

      {scene.compiledPrompt && <details className="bg-muted/45 rounded-lg px-3 py-2.5">
        <summary className="marker:text-muted-foreground focus-visible:ring-ring cursor-pointer text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
          View exact prompt sent to the video model
        </summary>
        <p className="border-border/60 text-foreground/85 mt-3 border-t pt-3 text-sm leading-relaxed whitespace-pre-wrap">{scene.compiledPrompt}</p>
      </details>}

      {scene.warnings.map(w => <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300" key={w}>{w}</p>)}
    </div>
  </CardContent>
</Card>;
