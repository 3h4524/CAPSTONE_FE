"use client";

import { useState } from "react";
import axios from "axios";
import type { TFunction } from "i18next";
import { Check, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/helpers/toast";
import { useSaveApiKey } from "@/hooks/mutations/use-save-api-key";
import { useApiKeyProviders } from "@/hooks/queries/use-api-key-providers";
import type { ApiKeyConnection } from "@/types/api-keys";

export function apiKeyError(error: unknown, t: TFunction): string {
  if (axios.isAxiosError(error)) {
    const problem = error.response?.data;
    if (problem?.errors && typeof problem.errors === "object") {
      return Object.values(problem.errors)
        .flat()
        .filter((value) => typeof value === "string")
        .join(" ");
    }
    if (typeof problem?.detail === "string") return problem.detail;
  }
  return t("apiKeys.genericError");
}

export function ConnectionDialog({
  connection,
  deleting = false,
  initialProvider,
  connections,
  onClose,
}: {
  connection?: ApiKeyConnection;
  deleting?: boolean;
  /** Provider id to preselect when adding a new connection. */
  initialProvider?: string;
  connections: ApiKeyConnection[];
  onClose: () => void;
}) {
  const { t } = useTranslation("common");
  const providers = useApiKeyProviders(!deleting);
  const [provider, setProvider] = useState(
    connection?.provider.toLowerCase() ?? initialProvider ?? ""
  );
  const [name, setName] = useState(connection?.label ?? "");
  const [environment, setEnvironment] = useState(connection?.environment ?? "Production");
  const [key, setKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const selected = providers.data?.find((item) => item.id === provider);
  const duplicate = connections.some(
    (item) =>
      item.id !== connection?.id &&
      item.provider.toLowerCase() === provider &&
      item.status === "Connected"
  );
  const mutation = useSaveApiKey();
  const busy = mutation.isPending;

  const handleSubmit = () => {
    mutation.mutate(
      {
        connectionId: connection?.id,
        deleting,
        provider,
        name,
        environment: environment || null,
        apiKey: key || null,
        confirmed,
      },
      {
        onSuccess: () => {
          setKey("");
          showToast(
            "success",
            deleting
              ? t("apiKeys.keyDeleted")
              : connection
                ? t("apiKeys.keyUpdated")
                : t("apiKeys.msg52")
          );
          onClose();
        },
      }
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" showCloseButton={!busy}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="bg-muted text-primary rounded-lg p-2">
              <KeyRound className="size-5" />
            </span>
            <div className="space-y-1 text-left">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                {t("apiKeys.connectionDialogEyebrow")}
              </p>
              <DialogTitle>
                {deleting ? t("apiKeys.deleteDialogTitle") : connection ? t("apiKeys.editDialogTitle") : t("apiKeys.addDialogTitle")}
              </DialogTitle>
              <DialogDescription>
                {deleting
                  ? t("apiKeys.deleteDialogDescription", { provider: connection?.provider ?? "" })
                  : t("apiKeys.addEditDialogDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) handleSubmit();
          }}
          className="space-y-4"
        >
          {deleting ? (
            <p className="text-muted-foreground text-sm">
              {t("apiKeys.deleteConfirmBody")}
            </p>
          ) : (
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-provider">{t("apiKeys.providerLabel")}</Label>
                <Select
                  value={provider}
                  onValueChange={(value) => {
                    setProvider(value);
                    setKey("");
                    setConfirmed(false);
                    mutation.reset();
                  }}
                  disabled={Boolean(connection) || providers.isPending || busy}
                >
                  <SelectTrigger id="key-provider" className="w-full">
                    <SelectValue placeholder={t("apiKeys.providerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.data?.map((item) => (
                      <SelectItem key={item.id} value={item.id} disabled={!item.available}>
                        {item.name}
                        {!item.available ? " — OAuth required" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {providers.isError && (
                  <div role="alert" className="text-destructive text-xs">
                    {t("apiKeys.providerLoadError")}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void providers.refetch()}
                    >
                      {t("apiKeys.retry")}
                    </button>
                  </div>
                )}
                {duplicate && (
                  <p role="alert" className="text-destructive text-xs">
                    {t("apiKeys.msg51")}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="key-name">{t("apiKeys.keyNameLabel")}</Label>
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    placeholder={t("apiKeys.keyNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-environment">{t("apiKeys.environmentLabel")}</Label>
                  <Select value={environment} onValueChange={setEnvironment} disabled={busy}>
                    <SelectTrigger id="key-environment" className="w-full">
                      <SelectValue placeholder={t("apiKeys.environmentPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Production">{t("apiKeys.envProduction")}</SelectItem>
                      <SelectItem value="Sandbox">{t("apiKeys.envSandbox")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-value">
                  {connection ? t("apiKeys.replaceKeyLabel") : t("apiKeys.apiKeyLabel")}
                </Label>
                <Input
                  id="key-value"
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  required={!connection}
                  minLength={8}
                  maxLength={8192}
                  placeholder={
                    connection ? t("apiKeys.replaceKeyHint") : t("apiKeys.apiKeyPlaceholder")
                  }
                  aria-describedby="key-help"
                />
                <p id="key-help" className="text-muted-foreground text-xs">
                  {t("apiKeys.encryptionNote")}
                </p>
              </div>
              <div className="bg-muted/50 space-y-3 rounded-lg border p-3 text-xs">
                <div className="text-primary flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4" />
                  {t("apiKeys.permissionsTitle")}
                </div>
                <ul className="text-muted-foreground space-y-2">
                  {selected?.permissions.map((permission) => (
                    <li key={permission} className="flex gap-2">
                      <Check className="text-success-text size-3.5 shrink-0" />
                      {permission}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground">
                  {t("apiKeys.permissionsNote")}
                </p>
                <label className="flex cursor-pointer items-start gap-2 border-t pt-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="accent-primary mt-0.5"
                  />
                  {t("apiKeys.confirmPermissions")}
                </label>
              </div>
            </fieldset>
          )}
          {mutation.isError && (
            <p role="alert" className="text-destructive text-sm">
              {apiKeyError(mutation.error, t)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              {t("apiKeys.cancel")}
            </Button>
            <Button
              type="submit"
              variant={deleting ? "destructive" : "default"}
              disabled={
                busy ||
                (!deleting &&
                  (!selected?.available || !confirmed || duplicate || (!connection && !key)))
              }
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy
                ? deleting
                  ? t("apiKeys.deletingStatus")
                  : t("apiKeys.savingStatus")
                : deleting
                  ? t("apiKeys.submitDelete")
                  : connection && !key
                    ? t("apiKeys.submitSave")
                    : t("apiKeys.submitValidate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
