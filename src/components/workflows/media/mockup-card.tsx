"use client";
import Image from "next/image";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import type { MockupAsset } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

const APPROVAL_STYLES: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export const MockupCard = ({ asset, selected, selectable, onSelect, review }: { asset: MockupAsset; selected: boolean; selectable: boolean; onSelect: (id: string, selected: boolean) => void; review: boolean }) => {
  const { mutate: approve, isPending } = useReviewMockupAsset();
  return <div className={cn("overflow-hidden rounded-lg border bg-white transition-shadow", selected && "border-primary/50 ring-primary/15 ring-2", asset.approvalStatus === "rejected" && "opacity-75")}>
    <div className="relative bg-slate-50">
      <Image src={asset.previewUrl} alt={`${asset.role} product mockup`} width={asset.width} height={asset.height} unoptimized className="h-44 w-full object-contain" />
      <span className={cn("absolute top-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm", APPROVAL_STYLES[asset.approvalStatus] ?? "bg-white text-slate-600")}>{asset.approvalStatus} · r{asset.revision}</span>
    </div>
    <div className="space-y-2.5 p-3">
      <div className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{asset.role}</Badge>{asset.variantKey && <span className="text-muted-foreground text-xs">Variant: {asset.variantKey}</span>}</div>
      {asset.warnings.map(w => <p key={w} className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900">{w}</p>)}
      {selectable && <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium"><Checkbox checked={selected} onCheckedChange={checked => onSelect(asset.id, checked === true)} />Use in this run</label>}
      {review && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            aria-label="Approve mockup"
            className="h-10 w-full gap-1.5 rounded-md px-2.5 text-xs hover:translate-y-0"
            disabled={isPending || asset.approvalStatus === "approved"}
            onClick={() => approve({ id: asset.id, revision: asset.revision, approved: true })}
          >
            <Check aria-hidden="true" className="size-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 w-full gap-1.5 rounded-md border border-rose-200 px-2.5 text-xs text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 hover:translate-y-0"
            disabled={isPending || asset.approvalStatus === "rejected"}
            onClick={() => approve({ id: asset.id, revision: asset.revision, approved: false })}
          >
            <X aria-hidden="true" className="size-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  </div>;
};
