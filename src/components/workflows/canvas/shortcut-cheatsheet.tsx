"use client";

import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WORKFLOW_CANVAS_SHORTCUTS } from "@/constants/workflow";

export const ShortcutCheatsheet = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Canvas shortcuts"
        className="bg-card absolute top-3 right-3 z-10 rounded-full shadow-sm [@media(pointer:coarse)]:hidden"
      >
        <Keyboard aria-hidden="true" />
      </Button>
    </DialogTrigger>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
      <DialogHeader className="text-left">
        <DialogTitle>Canvas shortcuts</DialogTitle>
        <DialogDescription>Select, copy, duplicate and clear nodes without leaving the keyboard.</DialogDescription>
      </DialogHeader>
      <ul className="space-y-2.5">
        {WORKFLOW_CANVAS_SHORTCUTS.map((shortcut) => (
          <li key={shortcut.action} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-ink-700">{shortcut.action}</span>
            <span className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key) => (
                <kbd key={key} className="bg-ink-100 text-ink-700 rounded border px-1.5 py-0.5 font-mono text-[11px]">
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </DialogContent>
  </Dialog>
);
