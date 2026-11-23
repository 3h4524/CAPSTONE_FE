"use client";

import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceButtons } from "@/components/workflows/config-panel/fields/choice-buttons";
import { ChoiceCards } from "@/components/workflows/config-panel/fields/choice-cards";
import { CONTENT_ISSUE_CLASS, ContentIssueMessage } from "@/components/workflows/config-panel/fields/content-issue";
import { DesignRatioChoices } from "@/components/workflows/config-panel/fields/design-ratio-choices";
import { MockupSelectionField } from "@/components/workflows/config-panel/fields/mockup-selection-field";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { ProductSelect } from "@/components/workflows/config-panel/fields/product-select";
import { SourceSelect } from "@/components/workflows/config-panel/fields/source-select";
import { getVideoOutputFormat, getVideoOutputFormats } from "@/helpers/video-output-formats";
import { parseAspectRatio, readBoolean, readNumber, readString, readStringArray } from "@/helpers/workflow-config";
import { useContentIssue, useWorkflowContentIssuesStore } from "@/stores/workflow-content-issues";
import type { WorkflowField, WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeConfigFieldProps = {
  /** The node the field belongs to, so a setting the content check refused can be marked. */
  nodeId?: string;
  nodeType: WorkflowNodeType;
  field: WorkflowField;
  control: Control<WorkflowNodeConfig, unknown, WorkflowNodeConfig>;
  videoMode?: string;
};

// A short number range is offered as buttons; a longer one keeps the number box.
const MAX_BUTTON_CHOICES = 5;

const DESCRIPTION_CLASS = "text-xs leading-relaxed";

const translatedField = (field: WorkflowField, text: (key: string, fallback: string) => string): WorkflowField => {
  const label = text("label", field.label);
  switch (field.kind) {
    case "select":
      return {
        ...field,
        label,
        options: field.options.map((option) => ({
          ...option,
          label: text(`options.${option.value}.label`, option.label),
          description: option.description && text(`options.${option.value}.description`, option.description),
        })),
      };
    case "source-select":
      return {
        ...field,
        label,
        noneLabel: field.noneLabel && text("noneLabel", field.noneLabel),
        description: field.description && text("description", field.description),
      };
    case "product-select":
      return { ...field, label, description: field.description && text("description", field.description) };
    case "switch":
      return { ...field, label, description: text("description", field.description) };
    case "textarea":
      return {
        ...field,
        label,
        placeholder: text("placeholder", field.placeholder),
        description: field.description && text("description", field.description),
      };
    default:
      return { ...field, label };
  }
};

export const NodeConfigField = ({ nodeId, nodeType, field: sourceField, control, videoMode }: NodeConfigFieldProps) => {
  const { t } = useTranslation("common");
  // Text the content check refused when the workflow was saved or run: marked until the seller changes it.
  const contentIssue = useContentIssue(nodeId ?? "", sourceField.name);
  const resolveContentIssue = useWorkflowContentIssuesStore((state) => state.resolve);
  const base = `workflowEditor.fields.${nodeType}.${sourceField.name.replaceAll(".", "_")}`;
  const field = translatedField(sourceField, (key, fallback) => t(`${base}.${key}`, { defaultValue: fallback }));
  const optionalTag = <span className="text-muted-foreground ml-1 text-xs font-normal">{t("workflowConfig.fields.optional")}</span>;

  return (
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
          case "video-formats": {
            // The same ratio buttons as Design image's aspect ratio; the format's name and size are spelled out below.
            const selected = getVideoOutputFormat(controller.value, videoMode);
            return (
              <FormItem>
                <FormLabel required>{field.label}</FormLabel>
                <FormControl>
                  <ChoiceButtons
                    choices={getVideoOutputFormats(videoMode).map((format) => ({
                      value: format.value,
                      label: format.aspectRatio,
                      ratio: parseAspectRatio(format.aspectRatio),
                    }))}
                    value={selected.value}
                    label={field.label}
                    onChange={controller.onChange}
                  />
                </FormControl>
                <FormDescription className={DESCRIPTION_CLASS}>
                  {t(`workflowConfig.fields.videoFormats.${selected.value}`, { defaultValue: selected.label })} · {selected.dimensions} px
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }
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
            const max = field.name === "durationSeconds" ? 15 : field.max;
            if (max - field.min < MAX_BUTTON_CHOICES) {
              const choices = Array.from({ length: max - field.min + 1 }, (_, index) => {
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
                    max={max}
                    step={1}
                    value={value ?? ""}
                    onChange={(event) => controller.onChange(event.target.valueAsNumber)}
                    onBlur={controller.onBlur}
                  />
                </FormControl>
                <FormDescription className={DESCRIPTION_CLASS}>{t("workflowConfig.fields.between", { min: field.min, max })}</FormDescription>
                <FormMessage />
              </FormItem>
            );
          }
          case "textarea": {
            const text = readString(controller.value);
            const tooLong = field.maxLength !== undefined && text.trim().length > field.maxLength;
            return (
              <FormItem>
                <FormLabel className={cn(contentIssue && "text-destructive")}>{field.label}{optionalTag}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    className={cn("bg-card min-h-20 resize-y", contentIssue && CONTENT_ISSUE_CLASS)}
                    placeholder={field.placeholder}
                    value={text}
                    onChange={(event) => {
                      controller.onChange(event);
                      if (contentIssue && nodeId) resolveContentIssue(nodeId, field.name);
                    }}
                    onBlur={controller.onBlur}
                    {...(contentIssue ? { "aria-invalid": true } : {})}
                  />
                </FormControl>
                {contentIssue && <ContentIssueMessage message={contentIssue} />}
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
                  <DesignRatioChoices options={field.options} value={readString(controller.value)} label={field.label} onChange={controller.onChange} />
                ) : (
                  <OptionSelect
                    value={readString(controller.value)}
                    options={field.options}
                    placeholder={t("workflowConfig.fields.choosePlaceholder", { label: field.label.toLowerCase() })}
                    onChange={controller.onChange}
                  />
                )}
                <FormMessage />
              </FormItem>
            );
          case "source-select":
            return (
              <FormItem>
                <FormLabel required={!field.optional}>{field.label}{field.optional && optionalTag}</FormLabel>
                <SourceSelect
                  source={field.source}
                  label={field.label}
                  value={readString(controller.value)}
                  noneLabel={field.noneLabel}
                  onChange={controller.onChange}
                />
                {field.description && <FormDescription className={DESCRIPTION_CLASS}>{field.description}</FormDescription>}
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
                  templatePlacementsName={field.templatePlacementsName}
                  targetName={field.targetName}
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
};
