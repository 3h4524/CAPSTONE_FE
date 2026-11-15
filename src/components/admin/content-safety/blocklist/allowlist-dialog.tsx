"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { DIALOG_CLASS, DialogHead, Field, SwitchRow } from "@/components/admin/content-safety/blocklist/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSaveModerationAllowlist } from "@/hooks/mutations/use-admin-moderation-mutations";
import { type ModerationAllowlistFormValues, moderationAllowlistSchema } from "@/schemas/moderation-term";
import type { ModerationAllowlistItem } from "@/types/admin-moderation";
import { zodResolver } from "@hookform/resolvers/zod";

/** What the dialog edits: an existing phrase, or a new one with an optional starting text (e.g. from a log entry). */
export type AllowlistDialogTarget = { item: ModerationAllowlistItem } | { phrase: string; note?: string } | null;

const valuesOf = (target: AllowlistDialogTarget): ModerationAllowlistFormValues =>
  target && "item" in target
    ? { phrase: target.item.phrase, isActive: target.item.isActive, note: target.item.note ?? "" }
    : { phrase: target?.phrase ?? "", isActive: true, note: target?.note ?? "" };

export const AllowlistDialog = ({ target, onClose }: { target: AllowlistDialogTarget; onClose: () => void }) => {
  const editing = target && "item" in target ? target.item : null;
  const mutation = useSaveModerationAllowlist(onClose);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ModerationAllowlistFormValues>({ resolver: zodResolver(moderationAllowlistSchema), defaultValues: valuesOf(target) });

  useEffect(() => {
    if (target) reset(valuesOf(target));
  }, [target, reset]);

  const submit = handleSubmit((values) =>
    mutation.mutate({
      id: editing?.id ?? null,
      input: { phrase: values.phrase, isActive: values.isActive, note: values.note || null },
    })
  );

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className={DIALOG_CLASS}>
        <DialogHead
          icon={ShieldCheck}
          eyebrow={editing ? "EDIT ALLOWLIST PHRASE" : "ADD TO ALLOWLIST"}
          title={editing ? editing.phrase : "Allow a harmless phrase"}
          description="A phrase here is ignored by the keyword blocklist, e.g. “naked eye” or “nude color”. Gemini still checks the text."
          onClose={onClose}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3 sm:px-6">
            <Field
              label="Phrase"
              htmlFor="allowlist-phrase"
              hint="Matched on whole words, ignoring case and punctuation between words."
              error={errors.phrase?.message}
            >
              <Input id="allowlist-phrase" autoComplete="off" aria-invalid={Boolean(errors.phrase)} {...register("phrase")} />
            </Field>
            <Field label="Note (optional)" htmlFor="allowlist-note" error={errors.note?.message}>
              <Textarea id="allowlist-note" className="min-h-16" placeholder="Why this phrase is harmless" {...register("note")} />
            </Field>
            <div className="border-ink-200 rounded-xl border">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <SwitchRow
                    id="allowlist-active"
                    title="Active"
                    hint="A paused phrase stays listed but is not used."
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              {editing ? "Save changes" : "Add phrase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
