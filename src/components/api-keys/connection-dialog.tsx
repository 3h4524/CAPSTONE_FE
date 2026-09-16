"use client";

import { useState } from "react";
import axios from "axios";
import { Check, KeyRound, Loader2, ShieldCheck } from "lucide-react";

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

export function apiKeyError(error: unknown): string {
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
  return "Unable to complete this request. Please try again.";
}

export function ConnectionDialog({
  connection,
  deleting = false,
  connections,
  onClose,
}: {
  connection?: ApiKeyConnection;
  deleting?: boolean;
  connections: ApiKeyConnection[];
  onClose: () => void;
}) {
  const providers = useApiKeyProviders(!deleting);
  const [provider, setProvider] = useState(connection?.provider.toLowerCase() ?? "");
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
              ? "API key deleted."
              : connection
                ? "API key updated."
                : "MSG52 — API key added and validated successfully."
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
                Secure connection
              </p>
              <DialogTitle>
                {deleting ? "Delete API key" : connection ? "Edit API key" : "Add API key"}
              </DialogTitle>
              <DialogDescription>
                {deleting
                  ? `Disconnect ${connection?.provider} from your workspace?`
                  : "Connect a service used by your generation or publishing workflow."}
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
              The saved credential will be removed. Workflows using this connection will need a new
              key. This does not revoke the key at the provider.
            </p>
          ) : (
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-provider">Provider</Label>
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
                    <SelectValue placeholder="Select a provider" />
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
                    Unable to load providers.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void providers.refetch()}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {duplicate && (
                  <p role="alert" className="text-destructive text-xs">
                    MSG51 — This provider is already connected. Edit or delete its existing key.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="key-name">API key name (optional)</Label>
                  <Input
                    id="key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={100}
                    placeholder="e.g. Main workspace key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-environment">Environment</Label>
                  <Select value={environment} onValueChange={setEnvironment} disabled={busy}>
                    <SelectTrigger id="key-environment" className="w-full">
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Production">Production — Live</SelectItem>
                      <SelectItem value="Sandbox">Sandbox — Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-value">
                  {connection ? "Replace API key (optional)" : "API key"}
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
                    connection ? "Leave blank to keep the current key" : "Paste provider key"
                  }
                  aria-describedby="key-help"
                />
                <p id="key-help" className="text-muted-foreground text-xs">
                  Your key is encrypted. Only the final four characters are displayed after saving.
                </p>
              </div>
              <div className="bg-muted/50 space-y-3 rounded-lg border p-3 text-xs">
                <div className="text-primary flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4" />
                  Permissions your key needs
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
                  The connection check verifies access; it does not change the key’s permissions.
                </p>
                <label className="flex cursor-pointer items-start gap-2 border-t pt-3">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="accent-primary mt-0.5"
                  />
                  I confirm this key is restricted to the permissions APCS needs.
                </label>
              </div>
            </fieldset>
          )}
          {mutation.isError && (
            <p role="alert" className="text-destructive text-sm">
              {apiKeyError(mutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
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
                  ? "Deleting…"
                  : "Saving…"
                : deleting
                  ? "Delete API key"
                  : connection && !key
                    ? "Save changes"
                    : "Validate & save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
