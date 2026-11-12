"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Braces,
  Check,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { useCreateDesignTemplate } from "@/hooks/mutations/use-create-design-template";
import { useUpdateDesignTemplate } from "@/hooks/mutations/use-update-design-template";
import { useDesignTemplate } from "@/hooks/queries/use-design-template";
import { useDesignTemplateOptions } from "@/hooks/queries/use-design-template-options";
import { useIsPhone } from "@/hooks/use-is-phone";
import { type DesignTemplateFormValues, designTemplateSchema } from "@/schemas/design-template";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";

type DesignTemplateEditorProps = {
  templateId?: string;
};

const EMPTY_FORM: DesignTemplateFormValues = {
  name: "",
  nicheCategory: "",
  artStyle: "",
  basePrompt: "",
  negativePrompt: "",
  examples: [],
};

export function DesignTemplateEditor({ templateId }: DesignTemplateEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(templateId);
  const isPhone = useIsPhone();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const optionsQuery = useDesignTemplateOptions(Boolean(user));
  const templateQuery = useDesignTemplate(templateId ?? null, Boolean(user) && isEditing);
  const createMutation = useCreateDesignTemplate();
  const updateMutation = useUpdateDesignTemplate();
  const form = useForm<DesignTemplateFormValues>({
    resolver: zodResolver(designTemplateSchema),
    defaultValues: EMPTY_FORM,
    mode: "onBlur",
  });
  const examples = useFieldArray({ control: form.control, name: "examples" });
  const basePrompt = form.watch("basePrompt");
  const nicheCategory = form.watch("nicheCategory");
  const artStyle = form.watch("artStyle");
  const previewImageUrl = templateQuery.data?.previewImageUrl ?? null;
  const previewGenerationEnabled = optionsQuery.data?.previewGenerationEnabled ?? false;
  // With nothing to show or generate yet, a phone keeps only the summary.
  const showsPreview = previewGenerationEnabled || Boolean(previewImageUrl);
  const missingSubject = basePrompt.length > 0 && !basePrompt.includes("{subject}");
  const saving = createMutation.isPending || updateMutation.isPending;
  const loading =
    !user || optionsQuery.isPending || (isEditing && templateQuery.isPending);

  useEffect(() => {
    const template = templateQuery.data;
    const options = optionsQuery.data;
    if (!template || !options) return;
    if (!template.canEdit) {
      showToast("warning", "System templates are read-only. Clone one to customize it.");
      router.replace("/design-templates");
      return;
    }
    form.reset({
      name: template.name,
      nicheCategory: resolveOptionValue(template.nicheCategory, options.niches),
      artStyle: resolveOptionValue(template.artStyle, options.artStyles),
      basePrompt: template.basePrompt,
      negativePrompt: template.negativePrompt ?? "",
      examples: template.examples,
    });
  }, [form, optionsQuery.data, router, templateQuery.data]);

  useEffect(() => {
    setPreviewImageFailed(false);
  }, [previewImageUrl]);

  useEffect(() => {
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
  }, [form.formState.isDirty]);

  const styleLabel = useMemo(
    () =>
      optionsQuery.data?.artStyles.find((item) => item.value === artStyle)?.label ?? "Art style",
    [artStyle, optionsQuery.data?.artStyles]
  );

  const submit = form.handleSubmit((values) => {
    const input = {
      ...values,
      name: values.name.trim(),
      basePrompt: values.basePrompt.trim(),
      negativePrompt: values.negativePrompt.trim() || undefined,
      examples: values.examples.map((example) => ({
        subject: example.subject.trim(),
        prompt: example.prompt.trim(),
      })),
    };

    if (templateId) {
      updateMutation.mutate(
        { id: templateId, template: input },
        {
          onSuccess: () => {
            form.reset(input);
            showToast("success", "Template changes saved.");
            router.replace("/design-templates?scope=personal");
          },
        }
      );
      return;
    }

    createMutation.mutate(input, {
      onSuccess: () => {
        form.reset(input);
        showToast("success", "Personal template created.");
        router.replace("/design-templates?scope=personal");
      },
    });
  });

  const goBackToLibrary = () => {
    if (saving) return;
    if (form.formState.isDirty) {
      setIsExitDialogOpen(true);
      return;
    }
    router.push("/design-templates");
  };

  const discardChangesAndGoBack = () => {
    setIsExitDialogOpen(false);
    router.push("/design-templates");
  };

  const saveChangesAndGoBack = () => {
    setIsExitDialogOpen(false);
    void submit();
  };

  const addPlaceholder = (field: "basePrompt" | "negativePrompt", placeholder: string) => {
    const current = form.getValues(field);
    const spacer = current.length > 0 && !current.endsWith(" ") ? " " : "";
    form.setValue(field, `${current}${spacer}{${placeholder}}`, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  if (loading) {
    return (
      <main
        className="w-full min-w-0 p-4 sm:p-6"
        aria-label="Loading template editor"
      >
        <div className="bg-ink-200 h-10 w-64 animate-pulse rounded" />
        <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="bg-ink-100 h-[680px] animate-pulse rounded-[22px]" />
          <div className="bg-ink-100 h-80 animate-pulse rounded-[22px]" />
        </div>
      </main>
    );
  }

  if (optionsQuery.isError || (isEditing && templateQuery.isError)) {
    return (
      <main className="flex min-h-[65vh] w-full min-w-0 items-center justify-center p-4 text-center sm:p-6">
        <div className="border-ink-200 bg-card max-w-md rounded-[22px] border p-8 shadow-[0_18px_50px_rgba(39,55,80,0.08)]">
          <Layers3 className="text-ink-400 mx-auto size-8" aria-hidden="true" />
          <h1 className="font-display mt-4 text-2xl font-semibold">Editor could not be loaded</h1>
          <p className="text-ink-600 mt-2 text-sm">
            The template may no longer exist, or the connection was interrupted.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => router.replace("/design-templates")}
          >
            <RefreshCw aria-hidden="true" />
            Return to library
          </Button>
        </div>
      </main>
    );
  }

  return (
    // The bottom padding keeps the last section clear of the fixed save button.
    <main className="w-full min-w-0 p-4 max-md:p-0 max-md:pb-20 sm:p-6">
      <button
        type="button"
        className="text-ink-600 hover:text-ink-900 focus-visible:ring-primary/20 inline-flex min-h-10 items-center gap-2 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        onClick={goBackToLibrary}
        disabled={saving}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to library
      </button>
      <header className="border-ink-200 mt-4 flex items-start gap-4 border-b pb-6 max-md:mt-1 max-md:border-b-0 max-md:pb-0 sm:gap-5">
        <span className="bg-ink-200 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl max-md:hidden sm:size-13">
          <WandSparkles className="size-5 sm:size-[22px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-ink-500 text-[11px] font-bold tracking-[0.16em] uppercase">
            {isEditing ? "Personal template" : "New template"}
          </p>
          <h1 className="font-display text-ink-900 mt-1 text-3xl font-semibold tracking-[-0.03em] max-md:text-xl">
            {isEditing ? "Refine your prompt system" : "Build a reusable creative direction"}
          </h1>
          <p className="text-ink-600 mt-2 max-w-2xl text-sm leading-6 max-md:mt-1 max-md:text-xs max-md:leading-5">
            Keep the structure stable and use placeholders for the product-specific details you will
            supply later.
          </p>
        </div>
      </header>

      <form
        onSubmit={submit}
        className="mt-7 grid grid-cols-[minmax(0,1fr)] items-start gap-6 max-md:mt-4 max-md:gap-3 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="border-ink-200 bg-card min-w-0 space-y-6 rounded-[22px] border p-5 shadow-[0_16px_45px_rgba(39,55,80,0.055)] max-md:space-y-3 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none sm:p-7">
          <section className="max-md:bg-card grid grid-cols-[minmax(0,1fr)] gap-5 max-md:gap-4 max-md:rounded-2xl max-md:border max-md:p-4 sm:grid-cols-2" aria-labelledby="template-identity-title">
            <h2
              id="template-identity-title"
              className="font-display col-span-full text-xl font-semibold max-md:text-base"
            >
              Template identity
            </h2>
            <label className="text-ink-800 grid gap-2 text-sm font-semibold sm:col-span-2">
              Name
              <Input
                {...form.register("name")}
                placeholder="e.g. Botanical Linework"
                className="border-ink-300 min-h-11"
              />
              <FieldError message={form.formState.errors.name?.message} />
            </label>
            <Controller
              control={form.control}
              name="nicheCategory"
              render={({ field, fieldState }) => (
                <label className="text-ink-800 grid gap-2 text-sm font-semibold">
                  Niche
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => commitSelectValue(value, field.onChange)}
                  >
                    <SelectTrigger
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="border-ink-300 min-h-11 w-full"
                    >
                      <SelectValue placeholder="Choose a niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsQuery.data?.niches.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldState.error?.message} />
                </label>
              )}
            />
            <Controller
              control={form.control}
              name="artStyle"
              render={({ field, fieldState }) => (
                <label className="text-ink-800 grid gap-2 text-sm font-semibold">
                  Art style
                  <Select
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => commitSelectValue(value, field.onChange)}
                  >
                    <SelectTrigger
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="border-ink-300 min-h-11 w-full"
                    >
                      <SelectValue placeholder="Choose a style" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsQuery.data?.artStyles.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={fieldState.error?.message} />
                </label>
              )}
            />
          </section>

          <section className="border-ink-200 max-md:bg-card border-t pt-6 max-md:rounded-2xl max-md:border max-md:p-4" aria-labelledby="prompt-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="prompt-title" className="font-display text-xl font-semibold max-md:text-base">
                  Prompt framework
                </h2>
                <p className="text-ink-500 mt-1 text-sm">
                  Use only supported placeholders inside curly braces.
                </p>
              </div>
              <span className="text-ink-500 text-xs font-medium tabular-nums">
                {basePrompt.length} / {optionsQuery.data?.maximumBasePromptLength ?? 1000}
              </span>
            </div>
            <Textarea
              {...form.register("basePrompt")}
              rows={8}
              placeholder={
                isPhone
                  ? "A print-ready {style} illustration of {subject}"
                  : "Example: Create a print-ready {style} illustration of {subject} for the {niche} niche using {keywords}. Isolated artwork, no product mockup."
              }
              className="border-ink-300 mt-4 resize-y font-mono text-[13px] leading-6 max-md:max-h-52 max-md:min-h-28 max-md:text-base max-md:leading-6"
            />
            <FieldError message={form.formState.errors.basePrompt?.message} />
            <PlaceholderToolbar
              label="Insert into positive prompt"
              placeholders={optionsQuery.data?.placeholders ?? []}
              onInsert={(placeholder) => addPlaceholder("basePrompt", placeholder)}
            />
            {missingSubject && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Without {`{subject}`}, this template cannot adapt to a new design subject.
              </p>
            )}
            <label className="text-ink-800 mt-5 grid gap-2 text-sm font-semibold">
              Negative prompt <span className="text-ink-500 font-normal">Optional</span>
              <Textarea
                {...form.register("negativePrompt")}
                rows={4}
                placeholder="Leave empty, or list elements the model should avoid"
                className="border-ink-300 resize-y text-sm leading-6"
              />
              <FieldError message={form.formState.errors.negativePrompt?.message} />
            </label>
            <PlaceholderToolbar
              label="Insert into negative prompt"
              placeholders={optionsQuery.data?.placeholders ?? []}
              onInsert={(placeholder) => addPlaceholder("negativePrompt", placeholder)}
            />
          </section>

          <section className="border-ink-200 max-md:bg-card border-t pt-6 max-md:rounded-2xl max-md:border max-md:p-4" aria-labelledby="examples-title">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div>
                <h2 id="examples-title" className="font-display text-xl font-semibold max-md:text-base">
                  Examples
                </h2>
                <p className="text-ink-500 mt-1 text-sm">
                  Show how a subject becomes a finished creative direction.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={examples.fields.length >= (optionsQuery.data?.maximumExamples ?? 5)}
                onClick={() => examples.append({ subject: "", prompt: "" })}
              >
                <Plus aria-hidden="true" />
                Add example
              </Button>
            </div>
            {examples.fields.length === 0 ? (
              <div className="border-ink-300 bg-ink-50 text-ink-500 mt-4 rounded-xl border border-dashed p-5 text-sm">
                Examples are optional, but they make a personal template easier to reuse
                consistently.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {examples.fields.map((field, index) => (
                  <fieldset
                    key={field.id}
                    className="border-ink-200 bg-ink-50 relative grid gap-3 rounded-xl border p-4"
                  >
                    <legend className="text-ink-500 px-1 text-xs font-bold tracking-[0.1em] uppercase">
                      Example {index + 1}
                    </legend>
                    <label className="text-ink-700 grid gap-2 text-xs font-semibold">
                      Subject
                      <Input
                        {...form.register(`examples.${index}.subject`)}
                        placeholder="e.g. luna moth with wildflowers"
                        className="border-ink-300 bg-card"
                      />
                      <FieldError
                        message={form.formState.errors.examples?.[index]?.subject?.message}
                      />
                    </label>
                    <label className="text-ink-700 grid gap-2 text-xs font-semibold">
                      Resulting prompt
                      <Textarea
                        {...form.register(`examples.${index}.prompt`)}
                        rows={3}
                        placeholder="Describe the expected composition"
                        className="border-ink-300 bg-card text-sm leading-5"
                      />
                      <FieldError
                        message={form.formState.errors.examples?.[index]?.prompt?.message}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-ink-500 absolute top-2 right-2 hover:translate-y-0 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      onClick={() => examples.remove(index)}
                      aria-label={`Remove example ${index + 1}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </fieldset>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 max-md:space-y-0 lg:sticky lg:top-24">
          <div className="border-ink-200 bg-ink-100 overflow-hidden rounded-[18px] border shadow-[0_10px_30px_rgba(39,55,80,0.07)]">
            <div className={cn("border-ink-200 flex items-center justify-between border-b px-5 py-4", !showsPreview && "max-md:hidden")}>
              <div className="flex items-center gap-3">
                <span className="border-ink-200 bg-card text-primary flex size-10 items-center justify-center rounded-xl border shadow-sm">
                  <WandSparkles className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-ink-500 text-[10px] font-bold tracking-[0.15em] uppercase">
                    Live structure
                  </p>
                  <p className="text-ink-500 mt-0.5 text-xs">Personal template preview</p>
                </div>
              </div>
              <span className="border-ink-200 bg-card text-ink-500 rounded-md border px-2 py-1 text-[9px] font-bold tracking-[0.12em] uppercase">
                Draft
              </span>
            </div>
            <div className={cn("border-ink-200 bg-ink-100 border-b p-4", !showsPreview && "max-md:hidden")}>
              <div className="bg-card relative aspect-[4/3] overflow-hidden rounded-xl border border-white/80 shadow-[0_10px_26px_rgba(39,55,80,0.08)]">
                {previewImageUrl && !previewImageFailed ? (
                  <Image
                    fill
                    sizes="(max-width: 1023px) calc(100vw - 4rem), 288px"
                    src={previewImageUrl}
                    unoptimized
                    alt={`Preview artwork for ${form.watch("name") || "untitled template"}`}
                    className="object-contain"
                    onError={() => setPreviewImageFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <span className="border-ink-200 bg-card text-ink-500 flex size-11 items-center justify-center rounded-full border shadow-sm">
                      <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <p className="text-ink-700 mt-3 text-sm font-semibold">AI preview</p>
                    <p className="text-ink-500 mt-1 text-xs leading-5">
                      Your generated artwork preview will appear here.
                    </p>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11 w-full hover:translate-y-0 disabled:cursor-not-allowed"
                disabled={!previewGenerationEnabled}
                aria-describedby="preview-generation-status"
              >
                <WandSparkles aria-hidden="true" />
                {previewImageUrl ? "Regenerate Preview" : "Generate Preview"}
                {!previewGenerationEnabled && (
                  <span className="bg-ink-200 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] uppercase">
                    Coming soon
                  </span>
                )}
              </Button>
              <p
                id="preview-generation-status"
                className="text-ink-500 mt-2 text-center text-xs leading-5"
              >
                AI preview generation will be available in a future update.
              </p>
            </div>
            <div className="p-5 max-md:p-4">
              <h2 className="font-display text-ink-900 text-xl font-semibold tracking-[-0.02em] max-md:text-base">
                {form.watch("name") || "Untitled template"}
              </h2>
              <p className="text-ink-600 mt-2 text-sm leading-5 max-md:mt-0.5 max-md:text-xs">
                {nicheCategory || "Choose a niche"}{" "}
                <span className="text-ink-300 px-1" aria-hidden="true">
                  /
                </span>{" "}
                {styleLabel}
              </p>
              <div className="border-ink-200 text-ink-600 mt-5 space-y-2.5 border-t pt-4 text-xs max-md:hidden">
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Personal and editable</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Up to five examples</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>Private to your seller account</span>
                </p>
              </div>
            </div>
          </div>
          {/* Fixed to the foot of a phone's screen, where the tabs give way to it. */}
          <div className="max-md:bg-card space-y-4 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:space-y-1 max-md:border-t max-md:px-4 max-md:py-3">
            <Button type="submit" size="lg" className="min-h-12 w-full" disabled={saving}>
              <Save aria-hidden="true" />
              {saving ? "Saving..." : isEditing ? "Save changes" : "Create template"}
            </Button>
            {form.formState.isDirty && (
              <p className="text-center text-xs text-amber-700 dark:text-amber-300">You have unsaved changes.</p>
            )}
          </div>
        </aside>
      </form>
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="border-ink-200 rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertCircle className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>Save template changes?</DialogTitle>
            <DialogDescription className="leading-6">
              You have unsaved changes. Save them before returning to your template library?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-wrap">
            <Button type="button" variant="outline" onClick={discardChangesAndGoBack}>
              Discard changes
            </Button>
            <Button type="button" disabled={saving} onClick={saveChangesAndGoBack}>
              <Save aria-hidden="true" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-xs font-normal text-red-600 dark:text-red-400">{message}</span> : null;
}

function resolveOptionValue(value: string | null, options: ReadonlyArray<{ value: string }>) {
  const trimmedValue = value?.trim() ?? "";
  if (!trimmedValue) return "";
  const normalizedValue = trimmedValue.toLocaleLowerCase();

  return (
    options.find((option) => option.value.trim().toLocaleLowerCase() === normalizedValue)?.value ??
    trimmedValue
  );
}

function commitSelectValue(value: string, onChange: (value: string) => void) {
  // Radix's hidden native select can briefly emit an empty value while async options mount.
  // Empty is not a valid choice here, so do not let that internal event erase edit data.
  if (value) onChange(value);
}

function PlaceholderToolbar({
  label,
  placeholders,
  onInsert,
}: {
  label: string;
  placeholders: readonly string[];
  onInsert: (placeholder: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={label}>
      <span className="text-ink-500 inline-flex min-h-8 items-center gap-1.5 pr-1 text-xs font-semibold">
        <Braces className="size-4" aria-hidden="true" />
        Insert
      </span>
      {placeholders.map((placeholder) => (
        <button
          key={placeholder}
          type="button"
          className="border-ink-300 bg-card text-ink-700 hover:border-ink-400 hover:bg-ink-50 focus-visible:ring-primary/20 min-h-8 rounded-md border px-2.5 font-mono text-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
          onClick={() => onInsert(placeholder)}
        >
          {`{${placeholder}}`}
        </button>
      ))}
    </div>
  );
}
