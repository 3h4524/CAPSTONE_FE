"use client";

import { useState } from "react";
import { LayoutGrid, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PanelHeaderCloseContext } from "@/components/workflows/config-panel/layout/panel-header";
import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { NodePalette } from "@/components/workflows/palette/node-palette";

export const EditorPanelSheets = () => {
  const { t } = useTranslation("common");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 xl:hidden">
      <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t("workflowEditor.toolbar.openNodeLibrary")}
          >
            <LayoutGrid aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("workflowEditor.toolbar.nodeLibrary")}</SheetTitle>
            <SheetDescription>
              {t("workflowEditor.toolbar.nodeLibraryDescription")}
            </SheetDescription>
          </SheetHeader>
          <NodePalette onNodeAdded={() => setIsPaletteOpen(false)} />
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("workflowEditor.toolbar.openNodeSettings")}
          >
            <SlidersHorizontal aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:w-80 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("workflowEditor.toolbar.nodeSettings")}</SheetTitle>
            <SheetDescription>
              {t("workflowEditor.toolbar.nodeSettingsDescription")}
            </SheetDescription>
          </SheetHeader>
          {/* The sheet's own close button is the one shown: it also closes the checks shown with no node selected. */}
          <PanelHeaderCloseContext.Provider value={false}>
            <NodeConfigPanel />
          </PanelHeaderCloseContext.Provider>
        </SheetContent>
      </Sheet>
    </div>
  );
};
