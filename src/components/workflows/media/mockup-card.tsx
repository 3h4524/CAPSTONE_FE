"use client";
import { useState } from "react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MockupMetadataForm } from "@/components/workflows/media/mockup-metadata-form";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import type { MockupAsset } from "@/types/video-workflow";

export const MockupCard = ({ asset, artworkGroups, selected, selectable, onSelect, review }: { asset: MockupAsset; artworkGroups: string[]; selected: boolean; selectable: boolean; onSelect: (id: string, selected: boolean) => void; review: boolean }) => {
  const [showMetadata, setShowMetadata] = useState(false);
  const { mutate: approve, isPending } = useReviewMockupAsset();
  return <Card><CardContent className="space-y-3 p-3">
    <Image src={asset.previewUrl} alt={`${asset.role} product mockup`} width={asset.width} height={asset.height} unoptimized className="h-44 w-full rounded-md object-contain" />
    <div className="flex flex-wrap gap-2"><Badge variant="secondary">{asset.role}</Badge><Badge variant="outline">{asset.approvalStatus} · r{asset.revision}</Badge></div>
    {asset.variantKey && <p className="text-muted-foreground text-xs">Variant: {asset.variantKey}</p>}
    {selectable && <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={selected} onCheckedChange={checked => onSelect(asset.id, checked === true)} />Use in this run</label>}
    {asset.warnings.map(w => <p key={w} className="text-xs text-amber-700">{w}</p>)}
    <div className="flex flex-wrap gap-2">{review && <><Button type="button" size="sm" disabled={isPending || asset.approvalStatus === "approved"} onClick={() => approve({ id: asset.id, revision: asset.revision, approved: true })}>Approve mockup</Button><Button type="button" size="sm" variant="outline" disabled={isPending || asset.approvalStatus === "rejected"} onClick={() => approve({ id: asset.id, revision: asset.revision, approved: false })}>Reject</Button></>}
      <Button type="button" size="sm" variant="ghost" onClick={() => setShowMetadata(v => !v)} aria-expanded={showMetadata}>Adjust image</Button></div>
    {showMetadata && <MockupMetadataForm key={`${asset.id}-${asset.revision}`} asset={asset} artworkGroups={artworkGroups} />}
  </CardContent></Card>;
};
