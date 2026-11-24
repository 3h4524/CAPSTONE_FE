"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
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

  const scrollVertical = (direction: "up" | "down") => {
    if (!tabsListRef.current) return;
    tabsListRef.current.scrollBy({
      top: direction === "up" ? -60 : 60,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full max-w-full min-w-0">
      <Tabs
        orientation="vertical"
        value={currentTab}
        onValueChange={setSelectedTabId}
        className="flex w-full min-w-0 flex-row items-start gap-2"
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

        <div className="flex w-9 shrink-0 flex-col items-center pt-5">
          {groups.length > 5 && (
            <button
              type="button"
              onClick={() => scrollVertical("up")}
              className="text-wf-dim hover:text-wf-ink mb-1 p-0.5"
              aria-label="Scroll up"
            >
              <ChevronUp className="size-3" />
            </button>
          )}

          <TabsList
            ref={tabsListRef}
            className="bg-wf-line/25 no-scrollbar flex! h-auto! max-h-[195px] min-h-0 w-full! flex-col! gap-1.5 overflow-y-auto scroll-smooth rounded-lg p-1"
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
                className="group/tab border-wf-line/50 hover:border-wf-accent data-[state=active]:border-wf-accent data-[state=active]:ring-wf-accent data-[state=active]:ring-1.5 relative size-7 shrink-0 overflow-hidden rounded-md border p-0 transition-all focus-visible:outline-hidden data-[state=active]:scale-105"
              >
                {group.designThumbnail ? (
                  <Image
                    src={group.designThumbnail}
                    alt=""
                    fill
                    sizes="28px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-wf-dim text-[10px] font-bold">
                    {index + 1}
                  </span>
                )}
                <span className="absolute right-0 bottom-0 rounded-tl bg-black/75 px-1 py-px text-[7px] leading-none font-semibold text-white tabular-nums">
                  {index + 1}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.length > 5 && (
            <button
              type="button"
              onClick={() => scrollVertical("down")}
              className="text-wf-dim hover:text-wf-ink mt-1 p-0.5"
              aria-label="Scroll down"
            >
              <ChevronDown className="size-3" />
            </button>
          )}
        </div>
      </Tabs>
    </div>
  );
};
