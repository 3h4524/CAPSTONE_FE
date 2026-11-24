"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  shortLabel: string;
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
      const shortLabels = ["D1", "D2", "D3", "D4"];
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
            shortLabel: shortLabels[i],
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
      const count = designImages.length;
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
          shortLabel: count <= 2 ? `Design ${index + 1}` : `D${index + 1}`,
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

      const entries = Array.from(groupedByDesign.entries());
      const count = entries.length;

      return entries.map(([designKey, items], index) => ({
        id: designKey,
        label: `Design ${index + 1}`,
        shortLabel: count <= 2 ? `Design ${index + 1}` : `D${index + 1}`,
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

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsListRef.current) return;
    tabsListRef.current.scrollBy({
      left: direction === "left" ? -80 : 80,
      behavior: "smooth",
    });
  };

  const isGrid = groups.length <= 3;

  return (
    <div className="grid max-w-full min-w-0 gap-2 overflow-hidden">
      <Tabs value={currentTab} onValueChange={setSelectedTabId} className="w-full min-w-0 gap-2">
        <div className="relative flex max-w-full min-w-0 items-center">
          {!isGrid && (
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className="bg-wf-surface/90 hover:bg-wf-surface text-wf-dim absolute left-0 z-10 grid size-6 place-items-center rounded-l shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-3" />
            </button>
          )}

          <TabsList
            ref={tabsListRef}
            className={cn(
              "bg-wf-line/30 no-scrollbar min-w-0 rounded-md p-0.5",
              isGrid
                ? cn(
                    "grid h-7 w-full gap-1",
                    groups.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  )
                : "flex h-7 w-full justify-start gap-1 overflow-x-auto scroll-smooth px-6"
            )}
          >
            {groups.map((group) => (
              <TabsTrigger
                key={group.id}
                value={group.id}
                aria-label={group.label}
                onClick={(e) => {
                  if (!isGrid) {
                    (e.currentTarget as HTMLElement).scrollIntoView({
                      inline: "center",
                      behavior: "smooth",
                    });
                  }
                }}
                className={cn(
                  "data-[state=active]:bg-wf-surface data-[state=active]:text-wf-ink text-wf-dim flex h-6 items-center justify-center gap-1 rounded px-1 text-[10px] font-medium transition-all",
                  isGrid ? "w-full min-w-0" : "shrink-0 px-2"
                )}
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
                <span className="truncate">{group.shortLabel}</span>
                {group.items.length > 0 && (
                  <span className="text-wf-faint text-[9px] tabular-nums">
                    ({group.items.length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {!isGrid && (
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              className="bg-wf-surface/90 hover:bg-wf-surface text-wf-dim absolute right-0 z-10 grid size-6 place-items-center rounded-r shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>

        {groups.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-0 max-w-full min-w-0">
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
