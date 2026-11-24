"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
import type { PreviewImageItem } from "@/components/workflows/nodes/preview/image-preview-modal";
import { getMockupImageUrls } from "@/helpers/workflow-run";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";

type MockupPreviewProps = {
  status: WorkflowNodeStatus;
};

type DesignMockupGroup = {
  id: string;
  label: string;
  designThumbnail?: string;
  items: PreviewImageItem[];
};

export const MockupPreview = ({ status }: MockupPreviewProps) => {
  const { t } = useTranslation("common");
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  const job = useWorkflowRunStore((state) => state.job);
  const simulated = useRunSimulationStore((state) => state.images["apply-mockup"]);
  const simulatedDesigns = useRunSimulationStore((state) => state.images["design-image"]);

  const [selectedTabId, setSelectedTabId] = useState<string>("");

  const groups = useMemo<DesignMockupGroup[]>(() => {
    if (simulated && simulated.length > 0) {
      const perTab = Math.max(1, Math.ceil(simulated.length / 3));
      const tabCounts = [perTab, perTab, Math.max(1, simulated.length - perTab * 2)];
      const tabLabels = ["Design 1", "Design 2", "Design 3"];
      const templateNames = ["Black T-shirt", "White T-shirt", "Ceramic Mug", "Hoodie", "Tote Bag"];

      let offset = 0;
      const simGroups: DesignMockupGroup[] = [];

      for (let i = 0; i < 3; i++) {
        const count = tabCounts[i];
        const slice = simulated.slice(offset, offset + count);
        offset += count;

        if (slice.length > 0 || status === "running") {
          simGroups.push({
            id: `sim-design-${i + 1}`,
            label: tabLabels[i],
            designThumbnail: simulatedDesigns?.[i] ?? undefined,
            items: slice.map((url, sIndex) => ({
              url,
              label: templateNames[(offset + sIndex) % templateNames.length],
              subLabel: tabLabels[i],
            })),
          });
        }
      }

      return simGroups;
    }

    const mockupImages = mockupResult?.images ?? [];
    const designImages = job?.products.flatMap((product) => product.images) ?? [];

    if (designImages.length > 0) {
      return designImages.map((design, index) => {
        const matching = mockupImages.filter((mockup) => mockup.designImageId === design.id);
        const items: PreviewImageItem[] = matching.map((mockup, mIndex) => ({
          url: mockup.mockupImageUrl,
          label: mockup.garmentColor ?? `#${mIndex + 1}`,
          subLabel: `Design ${index + 1}`,
        }));

        return {
          id: design.id,
          label: `Design ${index + 1}`,
          designThumbnail: design.imageUrl,
          items,
        };
      });
    }

    if (mockupImages.length > 0) {
      const groupedByDesign = new Map<string, PreviewImageItem[]>();
      mockupImages.forEach((mockup, mIndex) => {
        const designKey = mockup.designImageId || "default";
        const current = groupedByDesign.get(designKey) ?? [];
        current.push({
          url: mockup.mockupImageUrl,
          label: mockup.garmentColor ?? `#${mIndex + 1}`,
        });
        groupedByDesign.set(designKey, current);
      });

      return Array.from(groupedByDesign.entries()).map(([designKey, items], index) => ({
        id: designKey,
        label: `Design ${index + 1}`,
        items,
      }));
    }

    return [];
  }, [simulated, simulatedDesigns, mockupResult, job, status]);

  if (groups.length <= 1) {
    const singleItems = groups[0]?.items ?? (simulated ?? getMockupImageUrls(mockupResult));
    return (
      <ImageGridPreview
        label={t("workflowEditor.runView.previewMockups")}
        images={singleItems}
        status={status}
      />
    );
  }

  const currentTab = groups.some((g) => g.id === selectedTabId)
    ? selectedTabId
    : groups[0].id;

  return (
    <div className="grid gap-2">
      <Tabs value={currentTab} onValueChange={setSelectedTabId} className="w-full gap-2">
        <TabsList className="bg-wf-line/30 no-scrollbar flex h-7 w-full justify-start gap-1 overflow-x-auto rounded-md p-0.5">
          {groups.map((group) => (
            <TabsTrigger
              key={group.id}
              value={group.id}
              className="data-[state=active]:bg-wf-surface data-[state=active]:text-wf-ink text-wf-dim flex h-6 shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium"
            >
              {group.designThumbnail && (
                <span className="relative size-3.5 shrink-0 overflow-hidden rounded-xs">
                  <Image
                    src={group.designThumbnail}
                    alt=""
                    fill
                    sizes="14px"
                    unoptimized
                    className="object-cover"
                  />
                </span>
              )}
              <span>{group.label}</span>
              {group.items.length > 0 && (
                <span className="text-wf-faint text-[9px] tabular-nums">
                  ({group.items.length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-0">
            <ImageGridPreview
              label={group.label}
              images={group.items}
              status={status}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
