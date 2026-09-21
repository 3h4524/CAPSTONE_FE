"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StylePreset } from "@/types/style-presets";
import { cn } from "@/utils/cn";

type ArtStyleFieldProps = {
  value: string;
  presets: StylePreset[];
  creating: boolean;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  onCreateNew: (name: string) => void;
};

export const ArtStyleField = ({ value, presets, creating, disabled = false, error, onChange, onCreateNew }: ArtStyleFieldProps) => {
  const [draft, setDraft] = useState(value);
  const query = draft.trim().toLowerCase();
  const matches =
    query.length === 0
      ? []
      : presets.filter((preset) => preset.name.toLowerCase().includes(query)).slice(0, 6);
  const exactMatch = presets.some((preset) => preset.name.toLowerCase() === query);

  const pick = (name: string) => {
    setDraft(name);
    onChange(name);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="prompt-style">
        Art Style <span aria-hidden="true">*</span>
      </Label>
      <Input
        id="prompt-style"
        placeholder="Watercolor"
        value={draft}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
      />
      {matches.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Matching art styles">
          {matches.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => pick(preset.name)}
                className={cn(
                  "flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-slate-50",
                  preset.name === value && "font-semibold"
                )}
              >
                <span className="truncate">{preset.name}</span>
                {preset.isMine ? null : <span className="text-muted-foreground text-xs">System</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.length > 0 && !exactMatch && (
        <Button type="button" variant="outline" size="sm" disabled={disabled || creating} onClick={() => onCreateNew(draft.trim())}>
          <Plus aria-hidden="true" />
          {creating ? "Creating style..." : `Create new style "${draft.trim()}"`}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
