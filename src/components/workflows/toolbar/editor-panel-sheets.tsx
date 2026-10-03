"use client";

import { useState } from "react";
import { LayoutGrid, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NodeConfigPanel } from "@/components/workflows/config-panel/node-config-panel";
import { NodePalette } from "@/components/workflows/palette/node-palette";

export const EditorPanelSheets = () => {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 xl:hidden">
      <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open node library">
            <LayoutGrid aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Node library</SheetTitle>
            <SheetDescription>Add steps to the workflow canvas.</SheetDescription>
          </SheetHeader>
          <NodePalette onNodeAdded={() => setIsPaletteOpen(false)} />
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Open node settings">
            <SlidersHorizontal aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Node settings</SheetTitle>
            <SheetDescription>Configure the selected node or review workflow checks.</SheetDescription>
          </SheetHeader>
          <NodeConfigPanel />
        </SheetContent>
      </Sheet>
    </div>
  );
};
