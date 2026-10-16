"use client";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MockupAsset, ScenePlan } from "@/types/video-workflow";

export const VideoSceneCard = ({ scene, asset }: { scene: ScenePlan; asset?: MockupAsset }) => <Card><CardContent className="space-y-2 p-3">
  <div className="flex items-center gap-2"><Badge variant="secondary">{scene.generationStrategy === "ai_shot" ? "AI Scene" : "Standard"}</Badge><span className="text-xs">Scene {scene.sceneOrder + 1} · {(scene.durationFrames / 30).toFixed(1)}s</span></div>
  {asset && <Image src={asset.previewUrl} alt={`Source mockup for scene ${scene.sceneOrder + 1}`} width={asset.width} height={asset.height} unoptimized className="h-28 w-full object-contain" />}
  <p className="text-muted-foreground text-xs">{scene.role} · {scene.motion} · {scene.transition} · source r{scene.sourceRevision}</p>
  {scene.aiTemplateCode && <p className="text-muted-foreground text-xs">{scene.aiTemplateCode.replaceAll("_", " ")} · prompt v{scene.promptVersion} · {scene.aiModelName ?? scene.aiModelKey} · {scene.aiSettings?.cameraMovement?.replaceAll("_", " ")} · {scene.aiSettings?.lighting?.replaceAll("_", " ")}</p>}
  {scene.compiledPrompt && <details className="text-xs"><summary className="text-muted-foreground cursor-pointer">View exact prompt sent to the video model</summary><p className="bg-muted mt-2 rounded p-2 leading-relaxed whitespace-pre-wrap">{scene.compiledPrompt}</p></details>}
  {scene.warnings.map(w => <p className="text-xs text-amber-700" key={w}>{w}</p>)}
</CardContent></Card>;
