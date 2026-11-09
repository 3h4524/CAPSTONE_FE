"use client";

import { useState } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { designMockups, Thumbnail } from "@/components/workflows/run/run-group-panel";
import { useUpdateRunGroupOverride } from "@/hooks/mutations/use-run-group-actions";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useRunGroup, useRunGroupId } from "@/hooks/queries/use-run-group";
import type { RunGroup, RunGroupTarget, SceneMockupOverride } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

type Cell = { targetKey: string; sceneIndex: number };

// The scenes of every chosen design, as the shared scene list resolves them, while the batch video run waits at
// Mockup Approval. A cell shows the design's image for that scene; picking another one keeps it for that design only.
export const RunGroupScenesGrid = () => {
  const groupId = useRunGroupId();
  const { data: group } = useRunGroup(groupId);
  const [cell, setCell] = useState<Cell | null>(null);
  if (!group || group.status !== "waiting_for_targets") return null;
  const chosen = group.targets.filter((target) => target.selected);
  if (chosen.length === 0)
    return <PanelNotice tone="info">Approve the mock-ups of a design at Mockup Approval to see its scenes here.</PanelNotice>;
  const sceneCount = Math.max(...chosen.map((target) => target.scenes.length), 0);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Each design uses its own mock-up made from the same template and color as the image you chose. Click an image to
        pick another one for that design only.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="text-muted-foreground text-left font-medium">Design</th>
              {Array.from({ length: sceneCount }, (_, index) => (
                <th key={index} className="text-muted-foreground font-medium">Scene {index + 1}</th>
              ))}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {chosen.map((target) => (
              <TargetRow key={target.key} group={group} target={target} sceneCount={sceneCount} cell={cell} onCell={setCell} />
            ))}
          </tbody>
        </table>
      </div>
      {cell && <ScenePicker group={group} cell={cell} onClose={() => setCell(null)} />}
    </div>
  );
};

const overridesOf = (target: RunGroupTarget): SceneMockupOverride[] =>
  target.scenes.filter((scene) => scene.overridden && scene.mockupId).map((scene) => ({ sceneIndex: scene.sceneIndex, mockupId: scene.mockupId! }));

const TargetRow = ({ group, target, sceneCount, cell, onCell }: {
  group: RunGroup; target: RunGroupTarget; sceneCount: number; cell: Cell | null; onCell: (cell: Cell | null) => void;
}) => {
  const { mutate: update, isPending } = useUpdateRunGroupOverride();
  return (
    <tr>
      <td className="max-w-32 truncate pr-2 align-middle">
        <span className="block truncate font-medium">{target.productName}</span>
        <span className="text-muted-foreground">{target.designLabel}</span>
      </td>
      {Array.from({ length: sceneCount }, (_, index) => {
        const scene = target.scenes.find((item) => item.sceneIndex === index);
        const active = cell?.targetKey === target.key && cell.sceneIndex === index;
        return (
          <td key={index} className="text-center align-middle">
            <button
              type="button"
              title={scene?.warning ?? (scene?.overridden ? "Picked for this design" : "From the shared scenes")}
              onClick={() => onCell(active ? null : { targetKey: target.key, sceneIndex: index })}
              className={cn(
                "rounded border-2 p-0.5",
                scene?.warning ? "border-amber-400" : scene?.overridden ? "border-primary" : "border-transparent",
                active && "ring-primary/40 ring-2"
              )}
            >
              {scene?.previewUrl ? (
                <Image src={scene.previewUrl} alt={`${target.designLabel} scene ${index + 1}`} width={48} height={48} unoptimized className="size-12 rounded bg-slate-50 object-contain" />
              ) : (
                <span className="text-muted-foreground flex size-12 items-center justify-center rounded bg-slate-50">—</span>
              )}
            </button>
          </td>
        );
      })}
      <td className="align-middle">
        {target.hasOverride && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Use the shared scenes for ${target.designLabel}`}
            disabled={isPending}
            onClick={() => update({ groupId: group.id, expectedRevision: group.revision, productId: target.productId, artworkGroupKey: target.artworkGroupKey, scenes: null })}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </td>
    </tr>
  );
};

const ScenePicker = ({ group, cell, onClose }: { group: RunGroup; cell: Cell; onClose: () => void }) => {
  const target = group.targets.find((item) => item.key === cell.targetKey);
  const { data: assets, isPending } = useMockupAssets(target?.productId ?? "");
  const { mutate: update, isPending: isSaving } = useUpdateRunGroupOverride();
  if (!target) return null;
  const approved = designMockups(assets, target).filter((asset) => asset.approvalStatus === "approved" && asset.approvedRevision === asset.revision);
  const current = target.scenes.find((scene) => scene.sceneIndex === cell.sceneIndex)?.mockupId;

  const pick = (mockupId: string) =>
    update(
      {
        groupId: group.id,
        expectedRevision: group.revision,
        productId: target.productId,
        artworkGroupKey: target.artworkGroupKey,
        scenes: [...overridesOf(target).filter((scene) => scene.sceneIndex !== cell.sceneIndex), { sceneIndex: cell.sceneIndex, mockupId }],
      },
      { onSuccess: onClose }
    );

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">
          {target.productName} · {target.designLabel} — Scene {cell.sceneIndex + 1}
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {isPending ? (
        <p className="text-muted-foreground text-xs">Loading mock-ups…</p>
      ) : approved.length === 0 ? (
        <PanelNotice tone="warning">This design has no approved mock-up.</PanelNotice>
      ) : (
        <div className="flex flex-wrap gap-2">
          {approved.map((asset) => (
            <button
              key={asset.id}
              type="button"
              disabled={isSaving}
              onClick={() => pick(asset.id)}
              className={cn("rounded border-2 p-0.5", asset.id === current ? "border-primary" : "border-transparent hover:border-slate-300")}
              aria-label={`Use ${asset.variantKey ?? asset.role} for scene ${cell.sceneIndex + 1}`}
            >
              <Thumbnail url={asset.previewUrl} label={asset.role} className="size-14" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
