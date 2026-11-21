"use client";

import { Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import { useRunFocus } from "@/hooks/use-run-focus";

const SHORTCUT_KEYS: Record<string, string> = {
  "Select multiple nodes": "selectMultiple",
  "Box select nodes": "boxSelect",
  "Select all nodes": "selectAll",
  "Copy selected nodes": "copySelected",
  "Paste copied nodes": "paste",
  "Duplicate selected nodes": "duplicateSelected",
  "Delete selected nodes": "deleteSelected",
  Undo: "undo",
  Redo: "redo",
  "Save workflow": "save",
  "Clear selection": "clearSelection",
};

const KEY_LABELS: Record<string, string> = { Click: "click", Drag: "drag" };

export const ShortcutCheatsheet = () => {
  const { t } = useTranslation("common");
  const { active: runActive } = useRunFocus();
  if (runActive) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t("workflowEditor.shortcuts.title")}
          className="bg-card absolute top-3 right-3 z-10 rounded-full shadow-sm [@media(pointer:coarse)]:hidden"
        >
          <Keyboard aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle>{t("workflowEditor.shortcuts.title")}</DialogTitle>
          <DialogDescription>{t("workflowEditor.shortcuts.description")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2.5">
          {WORKFLOW_CANVAS_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.action} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-ink-700">
                {t(`workflowEditor.shortcuts.${SHORTCUT_KEYS[shortcut.action]}`, {
                  defaultValue: shortcut.action,
                })}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="bg-ink-100 text-ink-700 rounded border px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {KEY_LABELS[key] ? t(`workflowEditor.shortcuts.keys.${KEY_LABELS[key]}`) : key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
