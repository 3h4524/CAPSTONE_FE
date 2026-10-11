"use client";

import type { Control } from "react-hook-form";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MockupTemplatePicker } from "@/components/workflows/config-panel/fields/mockup-template-picker";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { SourceSelect } from "@/components/workflows/config-panel/fields/source-select";
import { readBoolean, readNumber, readString, readStringArray } from "@/helpers/workflow-config";
import type { WorkflowField, WorkflowNodeConfig } from "@/types/workflow";

type NodeConfigFieldProps = {
  field: WorkflowField;
  control: Control<WorkflowNodeConfig, unknown, WorkflowNodeConfig>;
};

export const NodeConfigField = ({ field, control }: NodeConfigFieldProps) => (
  <FormField
    control={control}
    name={field.name}
    render={({ field: controller }) => {
      switch (field.kind) {
        case "switch":
          return (
            <FormItem className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <FormLabel>{field.label}</FormLabel>
                <FormDescription className="text-xs">{field.description}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={readBoolean(controller.value)} onCheckedChange={controller.onChange} />
              </FormControl>
            </FormItem>
          );
        case "number":
          return (
            <FormItem>
              <FormLabel required>{field.label}{field.unit ? ` (${field.unit})` : ""}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={1}
                  value={readNumber(controller.value) ?? ""}
                  onChange={(event) => controller.onChange(event.target.valueAsNumber)}
                  onBlur={controller.onBlur}
                />
              </FormControl>
              <FormDescription className="text-xs">Between {field.min} and {field.max}.</FormDescription>
              <FormMessage />
            </FormItem>
          );
        case "textarea":
          return (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder={field.placeholder}
                  value={readString(controller.value)}
                  onChange={controller.onChange}
                  onBlur={controller.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        case "select":
          return (
            <FormItem>
              <FormLabel required>{field.label}</FormLabel>
              <OptionSelect
                value={readString(controller.value)}
                options={field.options}
                placeholder={`Choose ${field.label.toLowerCase()}`}
                onChange={controller.onChange}
              />
              <FormMessage />
            </FormItem>
          );
        case "source-select":
          return (
            <FormItem>
              <FormLabel required>{field.label}</FormLabel>
              <SourceSelect source={field.source} label={field.label} value={readString(controller.value)} onChange={controller.onChange} />
              <FormMessage />
            </FormItem>
          );
        case "mockup-templates":
          return (
            <FormItem>
              <FormLabel required>{field.label}</FormLabel>
              <MockupTemplatePicker value={readStringArray(controller.value)} onChange={controller.onChange} />
              <FormMessage />
            </FormItem>
          );
      }
    }}
  />
);
