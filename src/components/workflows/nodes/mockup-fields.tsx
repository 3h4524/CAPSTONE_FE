"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { readStringArray, readTemplateColors } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";

export const MockupFields = ({ data }: { data: WorkflowNode["data"] }) => {
  const templateCount = readStringArray(data.config.mockupTemplateIds).length;
  const colors = [...new Set(Object.values(readTemplateColors(data.config.templateColors)).flat())];

  return (
    <>
      <NodeField
        value={templateCount > 0 ? `${templateCount} ${templateCount === 1 ? "template" : "templates"}` : undefined}
        placeholder="Choose mock-up templates"
        chevron
      />
      <div className="border-wf-line bg-wf-muted/50 flex h-8 items-center justify-between gap-2 rounded-md border px-2.5">
        {colors.length > 0 ? (
          <>
            <span className="flex items-center gap-1">
              {colors.slice(0, 3).map((color) => (
                <span
                  key={color}
                  className="border-wf-surface size-3.5 rounded-full border-2 shadow-[0_0_0_1px_var(--wf-line)]"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
              ))}
              {colors.length > 3 && (
                <span className="text-wf-faint text-[10px] leading-none">+{colors.length - 3}</span>
              )}
            </span>
            <span className="text-wf-dim text-[10px] leading-none">
              {colors.length} {colors.length === 1 ? "color" : "colors"}
            </span>
          </>
        ) : (
          <span className="text-wf-faint text-[11px] leading-none">No garment colors</span>
        )}
      </div>
    </>
  );
};
