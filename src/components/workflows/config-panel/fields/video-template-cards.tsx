"use client";

import { useRef } from "react";
import { Film, RotateCcw } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTemplateAvailability, recommendVideoTemplate, usableVideoAssets } from "@/helpers/video-templates";
import { readString } from "@/helpers/workflow-config";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useVideoTemplates } from "@/hooks/queries/use-video-templates";
import { useWorkflowStore } from "@/stores/workflow";
import { cn } from "@/utils/cn";

type Props = {
  value: string;
  onChange: (code: string, version: number) => void;
  disabled?: boolean;
};

export const VideoTemplateCards = ({ value, onChange, disabled }: Props) => {
  const productId = useWorkflowStore(state => readString(state.nodes.find(node => node.data.type === "product-input")?.data.config.productId));
  const { data: assets = [] } = useMockupAssets(productId);
  const { data: templates, isPending, isError, refetch } = useVideoTemplates();
  const previews = useRef<Record<string, HTMLVideoElement | null>>({});
  const recommendation = recommendVideoTemplate(assets);
  const approvedCount = usableVideoAssets(assets).length;

  const play = (code: string) => { void previews.current[code]?.play().catch(() => undefined); };
  const pause = (code: string) => previews.current[code]?.pause();

  if (isPending) return <SectionLoading label="Loading video templates" />;
  if (isError || !templates) return <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Reload templates</Button>;

  return <div className="space-y-2" role="radiogroup" aria-label="Video template">
    <button type="button" role="radio" aria-checked={value === "auto"} disabled={disabled || approvedCount === 0}
      onClick={() => onChange("auto", 2)}
      className={cn("focus-visible:ring-ring w-full rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55", value === "auto" ? "border-primary bg-primary/5" : "hover:bg-slate-50")}>
      <span className="flex items-center justify-between gap-2"><span className="font-semibold">Recommended automatically</span><Badge>Recommended</Badge></span>
      <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">{approvedCount ? recommendation.reason : "Approve at least one mockup to build a storyboard."}</span>
      {approvedCount > 0 && <span className="mt-2 block text-xs font-medium">Will use: {templates.find(item => item.code === recommendation.code)?.name ?? recommendation.code}</span>}
    </button>
    {templates.filter(template => template != null && template.code).map(template => {
      const availability = getTemplateAvailability(template, assets ?? []);
      const recommended = recommendation.code === template.code && approvedCount > 0;
      return <button key={`${template.code}-${template.version}`} type="button" role="radio" aria-checked={value === template.code}
        disabled={disabled || !availability.available}
        onMouseEnter={() => play(template.code)} onMouseLeave={() => pause(template.code)}
        onFocus={() => play(template.code)} onBlur={() => pause(template.code)}
        onClick={() => { onChange(template.code, template.version); play(template.code); }}
        className={cn("focus-visible:ring-ring w-full overflow-hidden rounded-lg border text-left transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-55", value === template.code ? "border-primary bg-primary/5" : "hover:bg-slate-50")}>
        <span className="grid grid-cols-[72px_1fr] gap-3 p-3">
          <span className="flex aspect-[1/2] items-center justify-center overflow-hidden rounded-md bg-slate-900">
            {template.previewVideoUrl ? <video ref={element => { previews.current[template.code] = element; }} src={template.previewVideoUrl} muted loop playsInline preload="metadata" aria-hidden="true" className="size-full object-cover" /> : <Film className="size-5 text-white" aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{template.name}</span>{recommended && <Badge variant="secondary">Suggested</Badge>}</span>
            <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">{template.description}</span>
            <span className="text-muted-foreground mt-2 block text-xs">{template.defaultDurationSeconds}s · 2–4 scenes · {template.defaultTransition}</span>
            {!availability.available && <span className="mt-2 block text-xs font-medium text-amber-700">{availability.reason}</span>}
          </span>
        </span>
      </button>;
    })}
    <p className="text-muted-foreground flex items-center gap-1 text-xs"><RotateCcw className="size-3.5" aria-hidden="true" />Changing templates rebuilds automatic scene choices.</p>
  </div>;
};
