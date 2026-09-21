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
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { useDesignTemplate } from "@/hooks/queries/use-design-template";
import { useDesignTemplateOptions } from "@/hooks/queries/use-design-template-options";
import { type DesignTemplateFormValues, designTemplateSchema } from "@/schemas/design-template";
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
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const authQuery = useCurrentUser();
  const optionsQuery = useDesignTemplateOptions(authQuery.isSuccess);
  const templateQuery = useDesignTemplate(templateId ?? null, authQuery.isSuccess && isEditing);
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
  const missingSubject = basePrompt.length > 0 && !basePrompt.includes("{subject}");
  const saving = createMutation.isPending || updateMutation.isPending;
  const loading =
    authQuery.isPending || optionsQuery.isPending || (isEditing && templateQuery.isPending);

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
        className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8"
        aria-label="Loading template editor"
      >
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[680px] animate-pulse rounded-[22px] bg-slate-100" />
          <div className="h-80 animate-pulse rounded-[22px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (authQuery.isError || optionsQuery.isError || (isEditing && templateQuery.isError)) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-[22px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(39,55,80,0.08)]">
          <Layers3 className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <h1 className="font-display mt-4 text-2xl font-semibold">Editor could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-600">
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
    <main className="mx-auto w-full max-w-[1180px] px-4 pt-7 pb-12 sm:px-6 lg:px-8">
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        onClick={goBackToLibrary}
        disabled={saving}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to library
      </button>
      <header className="mt-4 flex items-start gap-4 border-b border-slate-200 pb-6 sm:gap-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#dce8fb] text-[#273750] sm:size-13">
          <WandSparkles className="size-5 sm:size-[22px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">
            {isEditing ? "Personal template" : "New template"}
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            {isEditing ? "Refine your prompt system" : "Build a reusable creative direction"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep the structure stable and use placeholders for the product-specific details you will
            supply later.
          </p>
        </div>
      </header>

      <form
        onSubmit={submit}
        className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-6 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(39,55,80,0.055)] sm:p-7">
          <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="template-identity-title">
            <h2
              id="template-identity-title"
              className="font-display col-span-full text-xl font-semibold"
            >
              Template identity
            </h2>
            <label className="grid gap-2 text-sm font-semibold text-slate-800 sm:col-span-2">
              Name
              <Input
                {...form.register("name")}
                placeholder="e.g. Botanical Linework"
                className="min-h-11 border-slate-300"
              />
              <FieldError message={form.formState.errors.name?.message} />
            </label>
            <Controller
              control={form.control}
              name="nicheCategory"
              render={({ field, fieldState }) => (
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
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
                      className="min-h-11 w-full border-slate-300"
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
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
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
                      className="min-h-11 w-full border-slate-300"
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

          <section className="border-t border-slate-200 pt-6" aria-labelledby="prompt-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="prompt-title" className="font-display text-xl font-semibold">
                  Prompt framework
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use only supported placeholders inside curly braces.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {basePrompt.length} / {optionsQuery.data?.maximumBasePromptLength ?? 1000}
              </span>
            </div>
            <Textarea
              {...form.register("basePrompt")}
              rows={8}
              placeholder="Example: Create a print-ready {style} illustration of {subject} for the {niche} niche using {keywords}. Isolated artwork, no product mockup."
              className="mt-4 resize-y border-slate-300 font-mono text-[13px] leading-6"
            />
            <FieldError message={form.formState.errors.basePrompt?.message} />
            <PlaceholderToolbar
              label="Insert into positive prompt"
              placeholders={optionsQuery.data?.placeholders ?? []}
              onInsert={(placeholder) => addPlaceholder("basePrompt", placeholder)}
            />
            {missingSubject && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Without {`{subject}`}, this template cannot adapt to a new design subject.
              </p>
            )}
            <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-800">
              Negative prompt <span className="font-normal text-slate-500">Optional</span>
              <Textarea
                {...form.register("negativePrompt")}
                rows={4}
                placeholder="Leave empty, or list elements the model should avoid"
                className="resize-y border-slate-300 text-sm leading-6"
              />
              <FieldError message={form.formState.errors.negativePrompt?.message} />
            </label>
            <PlaceholderToolbar
              label="Insert into negative prompt"
              placeholders={optionsQuery.data?.placeholders ?? []}
              onInsert={(placeholder) => addPlaceholder("negativePrompt", placeholder)}
            />
          </section>

          <section className="border-t border-slate-200 pt-6" aria-labelledby="examples-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="examples-title" className="font-display text-xl font-semibold">
                  Examples
                </h2>
                <p className="mt-1 text-sm text-slate-500">
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
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-[#fafaf8] p-5 text-sm text-slate-500">
                Examples are optional, but they make a personal template easier to reuse
                consistently.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {examples.fields.map((field, index) => (
                  <fieldset
                    key={field.id}
                    className="relative grid gap-3 rounded-xl border border-slate-200 bg-[#fafaf8] p-4"
                  >
                    <legend className="px-1 text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">
                      Example {index + 1}
                    </legend>
                    <label className="grid gap-2 text-xs font-semibold text-slate-700">
                      Subject
                      <Input
                        {...form.register(`examples.${index}.subject`)}
                        placeholder="e.g. luna moth with wildflowers"
                        className="border-slate-300 bg-white"
                      />
                      <FieldError
                        message={form.formState.errors.examples?.[index]?.subject?.message}
                      />
                    </label>
                    <label className="grid gap-2 text-xs font-semibold text-slate-700">
                      Resulting prompt
                      <Textarea
                        {...form.register(`examples.${index}.prompt`)}
                        rows={3}
                        placeholder="Describe the expected composition"
                        className="border-slate-300 bg-white text-sm leading-5"
                      />
                      <FieldError
                        message={form.formState.errors.examples?.[index]?.prompt?.message}
                      />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-2 right-2 text-slate-500 hover:translate-y-0 hover:bg-red-50 hover:text-red-700"
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

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-[#f7f7f4] shadow-[0_10px_30px_rgba(39,55,80,0.07)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#273750] shadow-sm">
                  <WandSparkles className="size-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                    Live structure
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Personal template preview</p>
                </div>
              </div>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                Draft
              </span>
            </div>
            <div className="border-b border-slate-200 bg-[#eef1ed] p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/80 bg-white shadow-[0_10px_26px_rgba(39,55,80,0.08)]">
                {previewImageUrl && !previewImageFailed ? (
                  <Image
                    fill
                    sizes="(max-width: 1023px) calc(100vw - 4rem), 288px"
                    src={previewImageUrl}
                    alt={`Preview artwork for ${form.watch("name") || "untitled template"}`}
                    className="object-contain"
                    onError={() => setPreviewImageFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                      <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-700">AI preview</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
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
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.08em] uppercase">
                    Coming soon
                  </span>
                )}
              </Button>
              <p
                id="preview-generation-status"
                className="mt-2 text-center text-xs leading-5 text-slate-500"
              >
                AI preview generation will be available in a future update.
              </p>
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-slate-950">
                {form.watch("name") || "Untitled template"}
              </h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                {nicheCategory || "Choose a niche"}{" "}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  /
                </span>{" "}
                {styleLabel}
              </p>
              <div className="mt-5 space-y-2.5 border-t border-slate-200 pt-4 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Personal and editable</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Up to five examples</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Private to your seller account</span>
                </p>
              </div>
            </div>
          </div>
          <Button type="submit" size="lg" className="min-h-12 w-full" disabled={saving}>
            <Save aria-hidden="true" />
            {saving ? "Saving..." : isEditing ? "Save changes" : "Create template"}
          </Button>
          {form.formState.isDirty && (
            <p className="text-center text-xs text-amber-700">You have unsaved changes.</p>
          )}
        </aside>
      </form>
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent className="rounded-2xl border-slate-200 sm:max-w-lg">
          <DialogHeader>
            <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
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
  return message ? <span className="text-xs font-normal text-red-600">{message}</span> : null;
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
      <span className="inline-flex min-h-8 items-center gap-1.5 pr-1 text-xs font-semibold text-slate-500">
        <Braces className="size-4" aria-hidden="true" />
        Insert
      </span>
      {placeholders.map((placeholder) => (
        <button
          key={placeholder}
          type="button"
          className="min-h-8 rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-3 focus-visible:ring-[#273750]/20 focus-visible:outline-none"
          onClick={() => onInsert(placeholder)}
        >
          {`{${placeholder}}`}
        </button>
      ))}
    </div>
  );
}
