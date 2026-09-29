"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStartBatchJob } from "@/hooks/mutations/use-start-batch-job";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";
import { useStylePresets } from "@/hooks/queries/use-style-presets";
import { useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import type { BatchJobDetail } from "@/types/batch-jobs";

const NO_STYLE = "none";
const VARIATION_OPTIONS = [1, 2, 3, 4];
const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const IMAGE_QUOTA_CODE = "image_generation";
// The backend rejects page sizes above 48 (DesignTemplateRules.MaximumPageSize).
const MAX_TEMPLATE_PAGE_SIZE = 48;

// SRS 3.5.6 Image Generation Setup Page.
export const GenerationSetup = ({ job }: { job: BatchJobDetail }) => {
  const [templateId, setTemplateId] = useState("");
  const [styleId, setStyleId] = useState(NO_STYLE);
  const [variations, setVariations] = useState("1");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const systemTemplates = useDesignTemplates({ scope: "system", pageNumber: 1, pageSize: MAX_TEMPLATE_PAGE_SIZE });
  const personalTemplates = useDesignTemplates({ scope: "personal", pageNumber: 1, pageSize: MAX_TEMPLATE_PAGE_SIZE });
  const styles = useStylePresets();
  const overview = useSubscriptionOverview();
  const start = useStartBatchJob();

  const templates = [...(personalTemplates.data?.items ?? []), ...(systemTemplates.data?.items ?? [])];
  const variationCount = Number(variations);
  const totalImages = job.totalProducts * variationCount;
  const quota = overview.data?.usageQuotas.find((item) => item.quotaCode === IMAGE_QUOTA_CODE);
  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;
  const overQuota = remaining !== null && totalImages > remaining;
  const canStart = Boolean(templateId) && !overQuota && !start.isPending;

  const submit = async () => {
    try {
      await start.mutateAsync({
        batchJobId: job.id,
        designTemplateId: templateId,
        styleArtPresetId: styleId === NO_STYLE ? null : styleId,
        variationCount,
        aspectRatio,
      });
    } catch {
      // The error toast is shown by useMutation; nothing else to do here.
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="text-primary size-5" />
          Set up image generation
        </CardTitle>
        <CardDescription>
          {job.totalProducts} pending {job.totalProducts === 1 ? "product" : "products"} in &ldquo;{job.batchName}&rdquo;. The same
          design template and style apply to every product in this job.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Design template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a design template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.nicheCategory ? ` · ${template.nicheCategory}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Art style preset</Label>
            <Select value={styleId} onValueChange={setStyleId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STYLE}>No style</SelectItem>
                {(styles.data ?? []).map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Images per product</Label>
            <Select value={variations} onValueChange={setVariations}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VARIATION_OPTIONS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Aspect ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg border p-4 text-sm">
          <p className="font-medium">Estimated usage</p>
          <p className="text-muted-foreground mt-1">
            {job.totalProducts} products × {variationCount} ={" "}
            <span className="text-foreground font-semibold">{totalImages} images</span>
            {remaining !== null && <> · {remaining} image generations left in your plan</>}
          </p>
          {overQuota && (
            <p role="alert" className="text-destructive mt-2">
              You do not have enough image-generation quota. Upgrade your plan or reduce the number of variations.
            </p>
          )}
          {!templateId && <p className="text-muted-foreground mt-2">Choose a design template to enable Start.</p>}
        </div>

        <div className="flex justify-end">
          <Button disabled={!canStart} onClick={() => void submit()}>
            {start.isPending ? "Starting…" : "Start image job"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
