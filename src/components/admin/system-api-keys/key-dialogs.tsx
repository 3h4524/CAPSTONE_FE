"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DIALOG_CLASS, DialogHead, Field } from "@/components/admin/content-safety/blocklist/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddSystemApiKey, useDeleteSystemApiKey } from "@/hooks/mutations/use-admin-system-api-key-mutations";
import { type AddSystemApiKeyFormValues, addSystemApiKeySchema } from "@/schemas/admin-system-api-keys";
import type { AdminSystemApiKey, AdminSystemApiKeyProvider, SystemApiKeyProviderName } from "@/types/admin-system-api-keys";

const empty = (provider: SystemApiKeyProviderName): AddSystemApiKeyFormValues => ({ provider, label: "", key: "" });

type AddKeyDialogProps = {
  open: boolean;
  providers: AdminSystemApiKeyProvider[];
  onClose: () => void;
};

export const AddKeyDialog = ({ open, providers, onClose }: AddKeyDialogProps) => {
  const { t } = useTranslation("common");
  const first = providers[0]?.provider ?? "ideogram";
  const [values, setValues] = useState(() => empty(first));
  const [errors, setErrors] = useState<Partial<Record<keyof AddSystemApiKeyFormValues, string>>>({});
  const add = useAddSystemApiKey(onClose);

  // Each opening starts empty: the key typed last time is never kept around.
  useEffect(() => {
    if (open) {
      setValues(empty(first));
      setErrors({});
    }
  }, [open, first]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = addSystemApiKeySchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    setErrors({});
    add.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !add.isPending && onClose()}>
      <DialogContent showCloseButton={false} className={DIALOG_CLASS}>
        <DialogHead
          icon={KeyRound}
          eyebrow={t("admin.systemApiKeys.addKeyDialog.eyebrow")}
          title={t("admin.systemApiKeys.addKeyDialog.title")}
          description={t("admin.systemApiKeys.addKeyDialog.description")}
          onClose={onClose}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <Field label={t("admin.systemApiKeys.addKeyDialog.providerLabel")} htmlFor="system-key-provider">
              <Select
                value={values.provider}
                onValueChange={(provider) => setValues({ ...values, provider: provider as SystemApiKeyProviderName })}
              >
                <SelectTrigger id="system-key-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.provider} value={provider.provider}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={t("admin.systemApiKeys.addKeyDialog.nameLabel")}
              htmlFor="system-key-label"
              hint={t("admin.systemApiKeys.addKeyDialog.nameHint")}
              error={errors.label}
            >
              <Input
                id="system-key-label"
                value={values.label}
                maxLength={100}
                placeholder={t("admin.systemApiKeys.addKeyDialog.namePlaceholder")}
                aria-invalid={errors.label ? true : undefined}
                onChange={(event) => setValues({ ...values, label: event.target.value })}
              />
            </Field>
            <Field label={t("admin.systemApiKeys.addKeyDialog.apiKeyLabel")} htmlFor="system-key-value" error={errors.key}>
              <Input
                id="system-key-value"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={values.key}
                aria-invalid={errors.key ? true : undefined}
                onChange={(event) => setValues({ ...values, key: event.target.value })}
              />
            </Field>
          </div>
          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={add.isPending}>
              {t("admin.systemApiKeys.cancel")}
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? t("admin.systemApiKeys.addKeyDialog.checking") : t("admin.systemApiKeys.addKeyDialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type DeleteKeyDialogProps = {
  apiKey: AdminSystemApiKey | null;
  onClose: () => void;
};

export const DeleteKeyDialog = ({ apiKey, onClose }: DeleteKeyDialogProps) => {
  const { t } = useTranslation("common");
  const remove = useDeleteSystemApiKey(onClose);

  return (
    <Dialog open={apiKey !== null} onOpenChange={(next) => !next && !remove.isPending && onClose()}>
      <DialogContent showCloseButton={false} className={`${DIALOG_CLASS} max-w-[460px]`}>
        <DialogHead
          icon={Trash2}
          eyebrow={t("admin.systemApiKeys.deleteKeyDialog.eyebrow")}
          title={
            apiKey ? t("admin.systemApiKeys.deleteKeyDialog.title", { label: apiKey.label }) : t("admin.systemApiKeys.deleteKeyDialog.titleFallback")
          }
          description={t("admin.systemApiKeys.deleteKeyDialog.description")}
          onClose={onClose}
        />
        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={remove.isPending}>
            {t("admin.systemApiKeys.cancel")}
          </Button>
          <Button type="button" variant="destructive" disabled={!apiKey || remove.isPending} onClick={() => apiKey && remove.mutate(apiKey.id)}>
            {remove.isPending ? t("admin.systemApiKeys.deleteKeyDialog.deleting") : t("admin.systemApiKeys.deleteKeyDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
