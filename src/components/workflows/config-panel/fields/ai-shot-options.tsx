"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readString } from "@/helpers/workflow-config";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useWorkflowStore } from "@/stores/workflow";
import type { GenerateVideoConfig } from "@/types/video-workflow";

type Options = NonNullable<GenerateVideoConfig["aiShotOptions"]>;
const defaults: Options = { coverage: "single_scene", concept: "product_cinematic", sceneIndex: 0, mockupId: null, prompt: null, rightsConfirmed: false, fullSceneMockupIds: null };
const concepts = [
  ["product_cinematic", "Product cinematic — smooth camera orbit / dolly"],
  ["material_detail", "Material detail — macro glide over print or texture"],
  ["lifestyle_motion", "Lifestyle motion — adult person moves naturally"],
  ["product_in_use", "Product in use — adult person uses the item"],
] as const;

export function AiShotOptions({ nodeId, disabled, onChange }: { nodeId: string; disabled: boolean; onChange: (options: Options, seconds?: number) => void }) {
  const node = useWorkflowStore(state => state.nodes.find(n => n.id === nodeId));
  const productId = useWorkflowStore(state => readString(state.nodes.find(n => n.data.type === "product-input")?.data.config.productId));
  const { data: allAssets = [] } = useMockupAssets(productId);
  const assets = allAssets.filter(asset => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision);
  if (!node || node.data.config.mode !== "ai_shot") return null;
  const options = { ...defaults, ...(node.data.config.aiShotOptions as Partial<Options> | undefined) };
  const duration = Number(node.data.config.durationSeconds ?? 12);
  const update = (changes: Partial<Options>, nextDuration?: number) => {
    const next = { ...options, ...changes };
    useWorkflowStore.getState().updateNodeConfig(nodeId, {
      ...node.data.config, aiShotOptions: next, ...(nextDuration === undefined ? {} : { durationSeconds: nextDuration }),
    });
    // The form validates its own copy; without this it keeps checking the previous coverage.
    onChange(next, nextDuration);
  };
  const needsPerson = options.concept === "lifestyle_motion" || options.concept === "product_in_use";
  const sourceAssets = needsPerson ? assets.filter(asset => asset.role === "Lifestyle")
    : options.concept === "material_detail" ? assets.filter(asset => asset.role === "ArtworkDetail" || asset.regions.detail) : assets;
  return <section className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3" aria-label="AI Shot settings">
    <div><p className="text-sm font-semibold">AI Shot setup</p><p className="text-muted-foreground text-xs">Veo Lite animates an approved image. Preview the storyboard, then confirm the estimated Google charge before rendering.</p></div>
    <label className="block space-y-1 text-xs font-medium">Coverage
      <Select disabled={disabled} value={options.coverage} onValueChange={value => update({ coverage: value as Options["coverage"], sceneIndex: 0 }, value === "full_video" ? 8 : Math.max(duration, 12))}>
        <SelectTrigger aria-label="AI Shot coverage"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single_scene">One AI scene + Standard scenes (12–15 s)</SelectItem><SelectItem value="full_video">Full AI video (8 or 15 s)</SelectItem></SelectContent>
      </Select>
    </label>
    {options.coverage === "full_video" && <label className="block space-y-1 text-xs font-medium">Length
      <Select disabled={disabled} value={String(duration)} onValueChange={value => update({}, Number(value))}><SelectTrigger aria-label="Full AI video length"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="8">8 seconds · 1 AI clip</SelectItem><SelectItem value="15">15 seconds · 2 AI clips with 1-second overlap</SelectItem></SelectContent></Select>
    </label>}
    {options.coverage === "single_scene" && <label className="block space-y-1 text-xs font-medium">Replace scene
      <Select disabled={disabled} value={String(options.sceneIndex)} onValueChange={value => update({ sceneIndex: Number(value) })}><SelectTrigger aria-label="Scene to animate with AI"><SelectValue /></SelectTrigger><SelectContent>{[0, 1, 2, 3].map(index => <SelectItem key={index} value={String(index)}>Scene {index + 1}</SelectItem>)}</SelectContent></Select>
    </label>}
    <label className="block space-y-1 text-xs font-medium">Motion template
      <Select disabled={disabled} value={options.concept} onValueChange={value => update({ concept: value as Options["concept"], mockupId: null, fullSceneMockupIds: null })}>
        <SelectTrigger aria-label="AI Shot motion template"><SelectValue /></SelectTrigger><SelectContent>{concepts.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </label>
    <label className="block space-y-1 text-xs font-medium">Source image
      <Select disabled={disabled || sourceAssets.length === 0} value={options.mockupId ?? "auto"} onValueChange={value => update({ mockupId: value === "auto" ? null : value })}>
        <SelectTrigger aria-label="AI Shot source mockup"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto-select approved image</SelectItem>{sourceAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.role} · {asset.id.slice(0, 8)}</SelectItem>)}</SelectContent>
      </Select>
    </label>
    {options.coverage === "full_video" && duration === 15 && sourceAssets.length > 0 && <div className="space-y-2">
      <p className="text-xs font-medium">Two AI shots (1-second overlap)</p>
      {[0, 1].map(index => <label key={index} className="block space-y-1 text-xs">{index === 0 ? "Opening image" : "Closing image"}
        <Select disabled={disabled} value={options.fullSceneMockupIds?.[index] ?? "auto"} onValueChange={value => {
          if (value === "auto") { update({ fullSceneMockupIds: null }); return; }
          const first = options.fullSceneMockupIds?.[0] ?? sourceAssets[0]!.id;
          const second = options.fullSceneMockupIds?.[1] ?? sourceAssets[Math.min(1, sourceAssets.length - 1)]!.id;
          update({ fullSceneMockupIds: index === 0 ? [value, second] : [first, value] });
        }}><SelectTrigger aria-label={index === 0 ? "Opening AI Shot image" : "Closing AI Shot image"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto-select</SelectItem>{sourceAssets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.role} · {asset.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select>
      </label>)}</div>}
    {sourceAssets.length === 0 && <p className="text-xs text-amber-800">Approve a suitable {needsPerson ? "Lifestyle image showing an adult" : options.concept === "material_detail" ? "detail image" : "mockup"} first.</p>}
    <label className="block space-y-1 text-xs font-medium">Optional motion direction
      <textarea disabled={disabled} maxLength={300} value={options.prompt ?? ""} onChange={event => update({ prompt: event.target.value || null })} placeholder="E.g. slow dolly left; keep the print unchanged" className="bg-background min-h-18 w-full rounded-md border p-2 text-sm font-normal" />
    </label>
    {needsPerson && <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" disabled={disabled} checked={options.rightsConfirmed} onChange={event => update({ rightsConfirmed: event.target.checked })} className="mt-1" /><span>I have rights to use this image of an adult person for AI video generation. The person must already be visible in the approved Lifestyle image.</span></label>}
    <p className="text-muted-foreground text-xs">AI motion can alter product details. Inspect the finished clip before approval. Output is silent; source audio is removed.</p>
  </section>;
}
