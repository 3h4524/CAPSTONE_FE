"use client";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflowCapabilities } from "@/hooks/queries/use-workflow-capabilities";
import { cn } from "@/utils/cn";

const LABELS: Record<string, string> = { standard: "Standard Showcase", ai_background: "AI Background", ai_shot: "AI Shot" };
export const VideoModeCards = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { data: capabilities, isPending, isError, refetch } = useWorkflowCapabilities();
  if (isPending) return <SectionLoading label="Loading video modes" />;
  if (isError) return <Button type="button" variant="outline" onClick={() => refetch()}>Reload video modes</Button>;
  return <div className="space-y-2" role="group" aria-label="Video mode">{capabilities?.videoModes.map(mode => <Button key={mode.mode} type="button" variant="outline" disabled={!mode.enabled} aria-pressed={value === mode.mode} onClick={() => onChange(mode.mode)} className={cn("h-auto w-full flex-col items-start gap-2 p-3 text-left whitespace-normal", value === mode.mode && "border-primary bg-primary/5")}>
    <span className="flex w-full flex-wrap items-center gap-2 font-semibold">{LABELS[mode.mode] ?? mode.mode}<Badge variant={mode.enabled ? "secondary" : "outline"}>{mode.enabled ? "Available" : "Coming soon"}</Badge></span>
    <span className="text-muted-foreground text-xs leading-relaxed">{mode.description}</span>
    <span className="text-muted-foreground text-xs">{mode.estimatedCostRange?.note ?? (mode.mode === "standard" ? "No AI model cost. Render/storage resources still apply." : "Cost estimate will be provided before this mode is enabled.")}</span>
  </Button>)}</div>;
};
