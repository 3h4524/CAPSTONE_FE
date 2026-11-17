"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
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
          eyebrow={t(editing ? "admin.contentSafety.allowlist.eyebrowEdit" : "admin.contentSafety.allowlist.eyebrowAdd")}
          title={editing ? editing.phrase : t("admin.contentSafety.allowlist.titleAdd")}
          description={t("admin.contentSafety.allowlist.description")}
          onClose={onClose}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3 sm:px-6">
            <Field
              label={t("admin.contentSafety.allowlist.phraseLabel")}
              htmlFor="allowlist-phrase"
              hint={t("admin.contentSafety.allowlist.phraseHint")}
              error={errors.phrase?.message}
            >
              <Input id="allowlist-phrase" autoComplete="off" aria-invalid={Boolean(errors.phrase)} {...register("phrase")} />
            </Field>
            <Field label={t("admin.contentSafety.common.noteLabel")} htmlFor="allowlist-note" error={errors.note?.message}>
              <Textarea
                id="allowlist-note"
                className="min-h-16"
                placeholder={t("admin.contentSafety.allowlist.notePlaceholder")}
                {...register("note")}
              />
            </Field>
            <div className="border-ink-200 rounded-xl border">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <SwitchRow
                    id="allowlist-active"
                    title={t("admin.contentSafety.common.active")}
                    hint={t("admin.contentSafety.allowlist.activeHint")}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <div className="border-ink-100 flex justify-end gap-2 border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              {t("admin.contentSafety.common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              {t(editing ? "admin.contentSafety.dialog.saveChanges" : "admin.contentSafety.common.addPhrase")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
