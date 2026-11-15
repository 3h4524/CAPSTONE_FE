"use client";

import { useEffect } from "react";
import { ShieldBan } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { DIALOG_CLASS, DialogHead, Field, SwitchRow } from "@/components/admin/content-safety/blocklist/form-parts";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSaveModerationTerm } from "@/hooks/mutations/use-admin-moderation-mutations";
import { matchTypeOf, type ModerationTermFormValues, moderationTermSchema } from "@/schemas/moderation-term";
import type { ModerationTerm } from "@/types/admin-moderation";
import { zodResolver } from "@hookform/resolvers/zod";

export type TermDialogTarget = { term: ModerationTerm } | { create: true } | null;

const valuesOf = (target: TermDialogTarget): ModerationTermFormValues =>
  target && "term" in target
    ? {
        term: target.term.term,
        category: target.term.category,
        severity: target.term.severity,
        matchUnaccented: target.term.matchUnaccented,
        language: target.term.language,
        isActive: target.term.isActive,
        note: target.term.note ?? "",
      }
    : { term: "", category: "sexual", severity: "block", matchUnaccented: false, language: "vi", isActive: true, note: "" };

const SEVERITY_OPTIONS = [
  { value: "block", title: "Block", hint: "Refuse the text at once, without asking Gemini." },
  { value: "flag", title: "Flag", hint: "Let Gemini decide, telling it to look at this category closely." },
] as const;

export const TermDialog = ({ target, onClose }: { target: TermDialogTarget; onClose: () => void }) => {
  const editing = target && "term" in target ? target.term : null;
  const mutation = useSaveModerationTerm(onClose);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ModerationTermFormValues>({ resolver: zodResolver(moderationTermSchema), defaultValues: valuesOf(target) });

  useEffect(() => {
    if (target) reset(valuesOf(target));
  }, [target, reset]);

  const term = watch("term");
  const isPhrase = matchTypeOf(term ?? "") === "phrase";

  const submit = handleSubmit((values) =>
    mutation.mutate({
      id: editing?.id ?? null,
      input: {
        term: values.term,
        category: values.category,
        severity: values.severity,
        matchType: matchTypeOf(values.term),
        matchUnaccented: values.matchUnaccented,
        language: values.language,
        isActive: values.isActive,
        note: values.note || null,
      },
    })
  );

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className={DIALOG_CLASS}>
        <DialogHead
          icon={ShieldBan}
          eyebrow={editing ? "EDIT BLOCKLIST TERM" : "ADD BLOCKLIST TERM"}
          title={editing ? editing.term : "New blocklist term"}
          description="Terms match whole words of the seller's text, ignoring case, look-alike characters (s3x) and letters spaced out (s.e.x)."
          onClose={onClose}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3 sm:px-6">
            <Field
              label="Word or phrase"
              htmlFor="term-text"
              hint={isPhrase ? "Several words: matched as a phrase, with any punctuation between them." : "One word: matched as a whole word only."}
              error={errors.term?.message}
            >
              <Input id="term-text" autoComplete="off" aria-invalid={Boolean(errors.term)} {...register("term")} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label="Category" htmlFor="term-category" error={errors.category?.message}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="term-category" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ORDER.map((category) => (
                          <SelectItem key={category} value={category}>
                            {CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Language" htmlFor="term-language">
                <Controller
                  name="language"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="term-language" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Vietnamese</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-ink-700 text-sm font-medium">When it matches</legend>
              <Controller
                name="severity"
                control={control}
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                    {SEVERITY_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={`term-severity-${option.value}`}
                        className="border-ink-200 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 flex cursor-pointer gap-3 rounded-xl border p-3"
                      >
                        <RadioGroupItem id={`term-severity-${option.value}`} value={option.value} className="mt-0.5" />
                        <span>
                          <span className="text-ink-800 dark:text-ink-100 block text-sm font-semibold">{option.title}</span>
                          <span className="text-ink-500 block text-xs leading-relaxed">{option.hint}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            </fieldset>

            <div className="divide-ink-100 border-ink-200 divide-y rounded-xl border">
              <Controller
                name="matchUnaccented"
                control={control}
                render={({ field }) => (
                  <SwitchRow
                    id="term-unaccented"
                    title="Also match without accents"
                    hint={
                      <>
                        Turn on only when the accent-free spelling is not an everyday word. “địt” → “dit” is safe;
                        “lồn” → “lon” (a can) or “cặc” → “các” would block normal text.
                      </>
                    }
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <SwitchRow
                    id="term-active"
                    title="Active"
                    hint="A paused term stays listed but is not matched."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <Field label="Note (optional)" htmlFor="term-note" error={errors.note?.message}>
              <Textarea id="term-note" className="min-h-16" placeholder="Why it is listed, other meanings to watch" {...register("note")} />
            </Field>
          </div>
          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              {editing ? "Save changes" : "Add term"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
