"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveScene } from "@/helpers/video-scenes";
import { readStringArray } from "@/helpers/workflow-config";
import { videoAssetSelectionSchema } from "@/schemas/workflow";
import { useWorkflowStore } from "@/stores/workflow";
import type { MockupAsset } from "@/types/video-workflow";
import type { WorkflowNode } from "@/types/workflow";
import { zodResolver } from "@hookform/resolvers/zod";

type AssetForm = z.infer<typeof videoAssetSelectionSchema>;

export const VideoAssetsForm = ({ node, assets, disabled }: { node: WorkflowNode; assets: MockupAsset[]; disabled: boolean }) => {
  const form = useForm<AssetForm>({
    resolver: zodResolver(videoAssetSelectionSchema),
    defaultValues: {
      assetSelection: node.data.config.assetSelection === "manual" ? "manual" : "automatic",
      selectedMockupIds: readStringArray(node.data.config.selectedMockupIds),
      sceneOrder: readStringArray(node.data.config.sceneOrder),
      sceneMotionPresets: Array.isArray(node.data.config.sceneMotionPresets)
        ? node.data.config.sceneMotionPresets.map(value => typeof value === "string" ? value : null) as AssetForm["sceneMotionPresets"]
        : [],
    },
  });
  const order = form.watch("sceneOrder");
  const chosen = form.watch("selectedMockupIds");
  const motions = form.watch("sceneMotionPresets") ?? [];
  const approved = assets.filter(asset => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision);

  const move = (index: number, direction: -1 | 1) => {
    form.setValue("sceneOrder", moveScene(order, index, direction), { shouldDirty: true });
    form.setValue("sceneMotionPresets", moveScene(order.map((_, position) => motions[position] ?? null), index, direction), { shouldDirty: true });
  };

  return <Form {...form}><form className="space-y-3" onSubmit={form.handleSubmit(values => {
    useWorkflowStore.getState().updateNodeConfig(node.id, {
      ...node.data.config,
      assetSelection: values.assetSelection,
      selectedMockupIds: values.selectedMockupIds,
      sceneOrder: values.sceneOrder,
      sceneMotionPresets: values.sceneMotionPresets ?? [],
    });
    form.reset(values);
  })}>
    <fieldset className="space-y-3" disabled={disabled}>
      <FormField control={form.control} name="assetSelection" render={({ field }) => <FormItem><FormLabel>Assets</FormLabel><Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatic">Choose approved assets automatically</SelectItem><SelectItem value="manual">Choose approved assets myself</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
      {form.watch("assetSelection") === "manual" && approved.map((asset, index) => <label key={asset.id} className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={chosen.includes(asset.id)} onCheckedChange={checked => form.setValue("selectedMockupIds", checked ? [...chosen, asset.id] : chosen.filter(id => id !== asset.id), { shouldDirty: true, shouldValidate: true })} />{index + 1}. {asset.role} · {asset.variantKey ?? asset.id.slice(0, 8)}</label>)}
      <FormField control={form.control} name="selectedMockupIds" render={() => <FormItem><FormMessage /></FormItem>} />
      <p className="text-muted-foreground text-xs">Choose up to four scenes. Leave the order automatic to use the selected template.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => {
          const next = (chosen.length ? chosen : approved.map(asset => asset.id)).slice(0, 4);
          form.setValue("sceneOrder", next, { shouldDirty: true });
          form.setValue("sceneMotionPresets", next.map(() => null), { shouldDirty: true });
        }}>Use this order</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => {
          form.setValue("sceneOrder", [], { shouldDirty: true });
          form.setValue("sceneMotionPresets", [], { shouldDirty: true });
        }}>Auto order</Button>
      </div>
      {order.map((id, index) => <div key={id} className="flex items-center justify-between gap-2 rounded-md border p-2">
        <span className="text-xs">Scene {index + 1} · {assets.find(asset => asset.id === id)?.role ?? id.slice(0, 8)}</span>
        <div className="flex gap-2">
          <Button type="button" size="icon-sm" variant="outline" aria-label={`Move scene ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></Button>
          <Button type="button" size="icon-sm" variant="outline" aria-label={`Move scene ${index + 1} down`} disabled={index === order.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></Button>
        </div>
      </div>)}
      <FormField control={form.control} name="sceneOrder" render={() => <FormItem><FormMessage /></FormItem>} />
      <Button type="submit" size="sm" disabled={!form.formState.isDirty}>Apply scene changes</Button>
    </fieldset>
  </form></Form>;
};
