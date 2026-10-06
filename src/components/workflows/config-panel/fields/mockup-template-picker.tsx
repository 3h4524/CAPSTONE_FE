"use client";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";

const MAX_SELECTED_TEMPLATES = 5;

type MockupTemplatePickerProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export const MockupTemplatePicker = ({ value, onChange }: MockupTemplatePickerProps) => {
  const { data: templates, isPending, isError } = useMockupTemplates();

  if (isPending) return <SectionLoading label="Loading mock-up templates" className="justify-start p-2" />;

  if (isError || !templates) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">Mock-up templates could not be loaded.</p>;
  }

  if (templates.length === 0) {
    return <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">No mock-up templates are available yet.</p>;
  }

  const toggle = (templateId: string, checked: boolean) =>
    onChange(checked ? [...value, templateId] : value.filter((item) => item !== templateId));

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{value.length}/{MAX_SELECTED_TEMPLATES} selected</p>
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
        {templates.map((template) => {
          const checked = value.includes(template.id);
          const checkboxId = `mockup-${template.id}`;
          return (
            <div key={template.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
              <Checkbox
                id={checkboxId}
                checked={checked}
                disabled={!checked && value.length >= MAX_SELECTED_TEMPLATES}
                onCheckedChange={(state) => toggle(template.id, state === true)}
              />
              <Label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer font-normal">
                <span className="truncate">{template.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">{template.productType}</span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
