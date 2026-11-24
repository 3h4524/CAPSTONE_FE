"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGridPreview } from "@/components/workflows/nodes/preview/image-grid-preview";
import type { PreviewImageItem } from "@/components/workflows/nodes/preview/image-preview-modal";
import { getMockupImageUrls } from "@/helpers/workflow-run";
import { useRunSimulationStore } from "@/stores/run-simulation";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";

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
  const tabsListRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo<DesignMockupGroup[]>(() => {
    if (simulated && simulated.length > 0) {
      const tabCounts = [3, 2, 2, 2];
      const tabLabels = ["Design 1", "Design 2", "Design 3", "Design 4"];
      const templateNames = ["Black T-shirt", "White T-shirt", "Ceramic Mug", "Hoodie", "Tote Bag"];

      let offset = 0;
      const simGroups: DesignMockupGroup[] = [];

      for (let i = 0; i < 4; i++) {
        const count = tabCounts[i] ?? 2;
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

  const currentIndex = Math.max(
    0,
    groups.findIndex((g) => g.id === selectedTabId)
  );
  const currentTab = groups[currentIndex]?.id ?? groups[0].id;

  return (
    <div className="w-full max-w-full min-w-0">
      <Tabs
        orientation="vertical"
        value={currentTab}
        onValueChange={setSelectedTabId}
        className="flex w-full min-w-0 flex-row items-start gap-3"
      >
        <div className="min-w-0 flex-1">
          {groups.map((group) => (
            <TabsContent key={group.id} value={group.id} className="mt-0 w-full max-w-full min-w-0">
              <ImageGridPreview
                label={group.label}
                images={group.items}
                status={status}
              />
            </TabsContent>
          ))}
        </div>

        <div className="flex w-[136px] shrink-0 flex-col gap-1.5">
          <div className="text-wf-dim flex items-center justify-between px-1 text-[10px] font-semibold tracking-wider uppercase">
            <span>{t("workflowEditor.runView.designs", "Designs")}</span>
            <span className="text-wf-faint tabular-nums">({groups.length})</span>
          </div>

          <TabsList
            ref={tabsListRef}
            className="no-scrollbar flex! h-auto! max-h-[250px] min-h-0 w-full! flex-col! gap-1.5 overflow-y-auto scroll-smooth bg-transparent! p-0!"
          >
            {groups.map((group, index) => (
              <TabsTrigger
                key={group.id}
                value={group.id}
                aria-label={group.label}
                title={`${group.label} (${group.items.length})`}
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                }}
                className={cn(
                  "group/chip border-wf-line/60 bg-wf-surface/80 text-wf-ink/80 hover:border-wf-accent/40 hover:bg-wf-line/20 hover:text-wf-ink",
                  "data-[state=active]:border-wf-accent data-[state=active]:bg-wf-surface! data-[state=active]:text-wf-ink! data-[state=active]:ring-1.5 data-[state=active]:ring-wf-accent/30 data-[state=active]:shadow-xs",
                  "flex! h-9! w-full! shrink-0 cursor-pointer items-center justify-start! gap-2 rounded-lg border px-2.5 text-left transition-all"
                )}
              >
                <div className="border-wf-line/50 relative size-5 shrink-0 overflow-hidden rounded-sm border">
                  {group.designThumbnail ? (
                    <Image
                      src={group.designThumbnail}
                      alt=""
                      fill
                      sizes="20px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-wf-dim grid h-full place-items-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                  )}
                </div>

                <span className="flex-1 truncate text-xs font-medium">
                  {group.label}
                </span>

                <span className="text-wf-dim group-data-[state=active]/chip:text-wf-accent shrink-0 text-[10px] font-medium tabular-nums">
                  ({group.items.length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
};
