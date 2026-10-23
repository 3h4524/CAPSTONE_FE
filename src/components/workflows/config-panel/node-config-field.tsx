"use client";

import type { Control } from "react-hook-form";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceButtons } from "@/components/workflows/config-panel/fields/choice-buttons";
import { ChoiceCards } from "@/components/workflows/config-panel/fields/choice-cards";
import { MockupSelectionField } from "@/components/workflows/config-panel/fields/mockup-selection-field";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { ProductSelect } from "@/components/workflows/config-panel/fields/product-select";
import { SourceSelect } from "@/components/workflows/config-panel/fields/source-select";
import { VideoModeCards } from "@/components/workflows/config-panel/fields/video-mode-cards";
import { VideoOutputFormatCards } from "@/components/workflows/config-panel/fields/video-output-format-cards";
import { getVideoOutputFormat } from "@/helpers/video-output-formats";
import { parseAspectRatio, readBoolean, readNumber, readString, readStringArray } from "@/helpers/workflow-config";
import type { WorkflowField, WorkflowNodeConfig } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeConfigFieldProps = {
  field: WorkflowField;
  control: Control<WorkflowNodeConfig, unknown, WorkflowNodeConfig>;
  videoMode?: string;
};

// A short number range is offered as buttons; a longer one keeps the number box.
const MAX_BUTTON_CHOICES = 5;

const DESCRIPTION_CLASS = "text-xs leading-relaxed";
const OPTIONAL_TAG = <span className="text-muted-foreground ml-1 text-xs font-normal">Optional</span>;

export const NodeConfigField = ({ field, control, videoMode }: NodeConfigFieldProps) => (
  <FormField
    control={control}
    name={field.name}
    render={({ field: controller }) => {
      switch (field.kind) {
        case "product-select":
          return (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              <ProductSelect value={readString(controller.value)} onChange={controller.onChange} />
              {field.description && <FormDescription className={DESCRIPTION_CLASS}>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          );
        case "video-modes": return <FormItem><FormLabel>{field.label}</FormLabel><VideoModeCards value={readString(controller.value)} onChange={controller.onChange} /><FormMessage /></FormItem>;
        case "video-formats": return <FormItem><FormLabel>{field.label}</FormLabel><VideoOutputFormatCards mode={videoMode} value={getVideoOutputFormat(controller.value, videoMode).value} onChange={controller.onChange} /><FormMessage /></FormItem>;
        case "text": return <FormItem><FormLabel>{field.label}</FormLabel><FormControl><Input value={readString(controller.value)} onChange={controller.onChange} /></FormControl><FormMessage /></FormItem>;
        case "switch":
          return (
            <FormItem className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <FormLabel>{field.label}</FormLabel>
                <FormDescription className={DESCRIPTION_CLASS}>{field.description}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={readBoolean(controller.value)} onCheckedChange={controller.onChange} />
              </FormControl>
            </FormItem>
          );
        case "number": {
          const value = readNumber(controller.value);
          if (field.max - field.min < MAX_BUTTON_CHOICES) {
            const choices = Array.from({ length: field.max - field.min + 1 }, (_, index) => {
              const amount = String(field.min + index);
              return { value: amount, label: amount };
            });
            return (
              <FormItem>
                <FormLabel required>{field.label}{field.unit ? ` (${field.unit})` : ""}</FormLabel>
                <FormControl>
                  <ChoiceButtons
                    choices={choices}
                    value={value === undefined ? "" : String(value)}
                    label={field.label}
                    onChange={(next) => controller.onChange(Number(next))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }
          return (
            <FormItem>
              <FormLabel required>{field.label}{field.unit ? ` (${field.unit})` : ""}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={1}
                  value={value ?? ""}
                  onChange={(event) => controller.onChange(event.target.valueAsNumber)}
                  onBlur={controller.onBlur}
                />
              </FormControl>
              <FormDescription className={DESCRIPTION_CLASS}>Between {field.min} and {field.max}.</FormDescription>
              <FormMessage />
            </FormItem>
          );
        }
        case "textarea": {
          const text = readString(controller.value);
          const tooLong = field.maxLength !== undefined && text.trim().length > field.maxLength;
          return (
            <FormItem>
              <FormLabel>{field.label}{OPTIONAL_TAG}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  className="min-h-20 resize-y bg-white"
                  placeholder={field.placeholder}
                  value={text}
                  onChange={controller.onChange}
                  onBlur={controller.onBlur}
                />
              </FormControl>
              {(field.description || field.maxLength !== undefined) && (
                <div className="flex items-start justify-between gap-3">
                  {field.description ? <FormDescription className={DESCRIPTION_CLASS}>{field.description}</FormDescription> : <span />}
                  {field.maxLength !== undefined && (
                    <span className={cn("shrink-0 text-xs tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}>
                      {text.trim().length}/{field.maxLength}
                    </span>
                  )}
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }
        case "select":
          return (
            <FormItem>
              <FormLabel required>{field.label}</FormLabel>
              {field.display === "cards" ? (
                <FormControl>
                  <ChoiceCards name={field.name} options={field.options} value={readString(controller.value)} aria-label={field.label} onChange={controller.onChange} />
                </FormControl>
              ) : field.display === "ratios" ? (
                <FormControl>
                  <ChoiceButtons
                    choices={field.options.map((option) => ({ ...option, ratio: parseAspectRatio(option.value) }))}
                    value={readString(controller.value)}
                    label={field.label}
                    onChange={controller.onChange}
                  />
                </FormControl>
              ) : (
                <OptionSelect
                  value={readString(controller.value)}
                  options={field.options}
                  placeholder={`Choose ${field.label.toLowerCase()}`}
                  onChange={controller.onChange}
                />
              )}
              <FormMessage />
            </FormItem>
          );
        case "source-select":
          return (
            <FormItem>
              <FormLabel required={!field.optional}>{field.label}{field.optional && OPTIONAL_TAG}</FormLabel>
              <SourceSelect
                source={field.source}
                label={field.label}
                value={readString(controller.value)}
                noneLabel={field.noneLabel}
                onChange={controller.onChange}
              />
              <FormMessage />
            </FormItem>
          );
        case "mockup-selection":
          return (
            <FormItem>
              <FormLabel required>{field.label}</FormLabel>
              <MockupSelectionField
                templateColorsName={field.templateColorsName}
                templateBackgroundsName={field.templateBackgroundsName}
                value={readStringArray(controller.value)}
                onChange={controller.onChange}
              />
              <FormMessage />
            </FormItem>
          );
      }
    }}
  />
);
