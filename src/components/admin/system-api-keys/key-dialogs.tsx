"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";

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
          eyebrow="PLATFORM API KEY"
          title="Add a key"
          description="The key is checked with the provider before it is saved, then stored encrypted. It is never shown again."
          onClose={onClose}
        />
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <Field label="Provider" htmlFor="system-key-provider">
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
            <Field label="Name" htmlFor="system-key-label" hint="Which account the key belongs to, so others can tell keys apart." error={errors.label}>
              <Input
                id="system-key-label"
                value={values.label}
                maxLength={100}
                placeholder="e.g. Ideogram – team account 2"
                aria-invalid={errors.label ? true : undefined}
                onChange={(event) => setValues({ ...values, label: event.target.value })}
              />
            </Field>
            <Field label="API key" htmlFor="system-key-value" error={errors.key}>
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
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Checking…" : "Check and add"}
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
  const remove = useDeleteSystemApiKey(onClose);

  return (
    <Dialog open={apiKey !== null} onOpenChange={(next) => !next && !remove.isPending && onClose()}>
      <DialogContent showCloseButton={false} className={`${DIALOG_CLASS} max-w-[460px]`}>
        <DialogHead
          icon={Trash2}
          eyebrow="DELETE KEY"
          title={apiKey ? `Delete ${apiKey.label}?` : "Delete key?"}
          description="New requests stop using it, and the key itself is thrown away. A video scene still being made with it fails when its progress is asked for; switch the key off instead to let those finish."
          onClose={onClose}
        />
        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!apiKey || remove.isPending} onClick={() => apiKey && remove.mutate(apiKey.id)}>
            {remove.isPending ? "Deleting…" : "Delete key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
