"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowUpRight,
  BookOpen,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { apiKeyKeys, validateApiKey } from "@/api/api-keys";
import { apiKeyError, ConnectionDialog } from "@/components/api-keys/connection-dialog";
import { relativeTime } from "@/components/api-keys/relative-time";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useApiKeys } from "@/hooks/queries/use-api-keys";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import type { ApiKeyConnection } from "@/types/api-keys";
import { cn } from "@/utils/cn";

function ConnectionRow({
  connection,
  now,
  onEdit,
  onDelete,
  onValidate,
  busy,
}: {
  connection: ApiKeyConnection;
  now: number;
  onEdit: () => void;
  onDelete: () => void;
  onValidate: () => void;
  busy: boolean;
}) {
  const oauth = connection.authType === "OAuth";
  return (
    <tr className="border-border border-t">
      <th scope="row" className="px-4 py-4 text-left font-normal">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-background text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold"
          >
            {connection.provider.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <div className="text-foreground font-medium">{connection.provider}</div>
            <div
              className="text-primary max-w-48 truncate text-[10px] font-semibold tracking-wide uppercase"
              title={connection.label}
            >
              {connection.label}
            </div>
            <div className="text-muted-foreground text-xs">{connection.providerCategory}</div>
          </div>
        </div>
      </th>
      <td className="px-3 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium whitespace-nowrap",
            oauth ? "bg-violet-50 text-violet-700" : "bg-muted text-primary"
          )}
        >
          {!oauth && <KeyRound className="size-3" />}
          {connection.authType}
        </span>
      </td>
      <td className="px-3 py-4">
        {oauth ? (
          <span
            className="inline-block max-w-48 truncate align-middle"
            title={connection.credential}
          >
            {connection.credential}
          </span>
        ) : (
          <code className="bg-muted text-primary rounded px-2 py-1 text-[11px]">
            {connection.credential}
          </code>
        )}
      </td>
      <td className="px-3 py-4">
        {connection.environment ? (
          <span
            className="bg-muted text-primary inline-block max-w-32 truncate rounded px-2 py-1 text-[10px]"
            title={connection.environment}
          >
            {connection.environment}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-4">
        <span
          className={cn(
            "inline-flex rounded px-2 py-1 text-[10px] font-semibold whitespace-nowrap",
            connection.status === "Connected"
              ? "bg-success-background text-success-text"
              : "bg-amber-50 text-amber-800"
          )}
        >
          {connection.status}
        </span>
      </td>
      <td className="text-muted-foreground px-3 py-4 whitespace-nowrap">
        <time
          dateTime={connection.lastUsedAtUtc ?? undefined}
          title={connection.lastUsedAtUtc ?? "Never used"}
        >
          {relativeTime(connection.lastUsedAtUtc, now)}
        </time>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || oauth}
            onClick={onValidate}
            className="h-8 border px-3 text-xs"
          >
            {oauth ? "Reconnect" : "Validate"}
          </Button>
          {!oauth && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                disabled={busy}
                aria-label={`Edit ${connection.provider} ${connection.label}`}
              >
                <Pencil className="size-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={busy}
            aria-label={`Delete ${connection.provider} ${connection.label}`}
            className="text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function ApiKeysPage() {
  const queryClient = useAppQueryClient();
  const [dialog, setDialog] = useState<{
    connection?: ApiKeyConnection;
    deleting?: boolean;
  } | null>(null);
  const validation = useMutation({
    mutationFn: validateApiKey,
    onSuccess: () => showToast("success", "Connection validated."),
    onError: (error) => showToast("error", apiKeyError(error)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isSeller = user?.roles.includes("Seller") ?? false;
  const query = useApiKeys(isHydrated && isSeller ? user?.id : undefined);
  const [now, setNow] = useState(() => Date.now());
  const [guideOpen, setGuideOpen] = useState(false);
  const error = query.error;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login?returnUrl=%2Fapi-keys");
    }
  }, [isHydrated, user, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const forbidden = status === 403 || (isHydrated && !isSeller);
  const failed = query.isError;
  const loading = !isHydrated || (isSeller && query.isPending);
  const data = !failed && !forbidden && user ? query.data : undefined;

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">API keys</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect the services APCS uses to create and publish your products.
          </p>
        </div>
        <span>
          <Button disabled={!query.data || forbidden || failed} onClick={() => setDialog({})}>
            <Plus className="size-4" />
            Add API key
          </Button>
        </span>
      </header>
      <div className="bg-card mb-4 flex items-start gap-3 rounded-xl border px-4 py-4 shadow-sm">
        <LockKeyhole className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <h2 className="text-primary text-sm font-medium">Keys stay private.</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Only masked credentials are displayed. Full key values are never sent to this page.
          </p>
        </div>
      </div>

      {forbidden ? (
        <div role="alert" className="bg-card rounded-xl border p-8">
          <h2 className="font-semibold">Seller access required</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Only active Seller accounts can view API keys.
          </p>
        </div>
      ) : failed ? (
        <div role="alert" className="bg-card rounded-xl border p-8">
          <h2 className="font-semibold">
            {status === 401 ? "Please sign in" : "Unable to load API keys"}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {status === 401
              ? "Redirecting to sign in…"
              : "MSG16 — Unable to load API keys. Please refresh the page to try again."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div role="status" aria-label="Loading API keys" className="space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <span className="sr-only">Loading API keys…</span>
        </div>
      ) : data ? (
        <>
          <section
            aria-label="Connection summary"
            className="bg-card mb-4 grid grid-cols-2 overflow-hidden rounded-xl border shadow-sm md:grid-cols-[132px_148px_1fr]"
          >
            <div className="border-r px-5 py-4">
              <div className="text-2xl font-semibold">{data.connectedCount}</div>
              <div className="text-muted-foreground text-xs">Connected</div>
            </div>
            <div className="px-5 py-4 md:border-r">
              <div className="text-2xl font-semibold">{data.needsAttentionCount}</div>
              <div className="text-muted-foreground text-xs">Needs attention</div>
            </div>
            <div className="col-span-2 flex items-center gap-3 border-t px-5 py-4 md:col-span-1 md:border-t-0">
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-1 text-[10px] font-semibold",
                  data.isReady
                    ? "bg-success-background text-success-text"
                    : "bg-amber-50 text-amber-800"
                )}
              >
                {data.isReady ? "Ready" : "Not ready"}
              </span>
              <div>
                <h2 className="text-primary text-xs font-medium">
                  {data.isReady ? "Core workflow ready" : "Core workflow needs attention"}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {data.isReady
                    ? "Image, listing, and publishing services are available."
                    : "Connect and validate image, listing content, and product publishing services."}
                </p>
              </div>
            </div>
          </section>
          <section
            aria-labelledby="connected-services-title"
            className="bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Providers
                </p>
                <h2 id="connected-services-title" className="mt-1 text-base font-semibold">
                  Connected services
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px]">
                  {data.lastCheckedAtUtc
                    ? `Last checked ${relativeTime(data.lastCheckedAtUtc, now)}`
                    : "No connectivity checks yet"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Refresh API key list"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  <RefreshCw className={cn("size-3.5", query.isFetching && "animate-spin")} />
                </Button>
              </div>
            </div>
            {data.items.length === 0 ? (
              <div className="flex flex-col items-center border-t px-5 py-14 text-center">
                <div className="bg-muted text-primary mb-4 rounded-xl p-3">
                  <KeyRound className="size-7" />
                </div>
                <h3 className="text-lg font-semibold">No API keys yet</h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  Your connected services will appear here. Add an API key to get your workspace
                  ready.
                </p>
                <span>
                  <Button className="mt-5" onClick={() => setDialog({})}>
                    <Plus className="size-4" />
                    Add API key
                  </Button>
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-xs">
                  <caption className="sr-only">
                    Your service credentials, connection status, and last-used time
                  </caption>
                  <thead className="bg-muted/60 text-muted-foreground border-t text-left text-[9px] tracking-wider uppercase">
                    <tr>
                      {[
                        "Provider",
                        "Auth type",
                        "Credential",
                        "Environment",
                        "Status",
                        "Last used",
                        "Actions",
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-3 py-3 first:pl-4 last:pr-4 last:text-right"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((connection) => (
                      <ConnectionRow
                        key={connection.id}
                        connection={connection}
                        now={now}
                        onEdit={() => setDialog({ connection })}
                        onDelete={() => setDialog({ connection, deleting: true })}
                        onValidate={() => validation.mutate(connection.id)}
                        busy={validation.isPending}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-muted-foreground border-t px-5 py-3 text-[11px]">
              Edit to replace a key, or delete a connection you no longer use.
            </p>
          </section>
        </>
      ) : null}

      <footer className="bg-card mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="text-primary size-5 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold">Connecting a new provider?</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Use a restricted key where the provider supports it. Check the services your workflow
              needs.
            </p>
          </div>
        </div>
        <Button
          variant="link"
          size="sm"
          className="px-0 text-xs"
          onClick={() => setGuideOpen(true)}
        >
          Read setup guide
          <ArrowUpRight className="size-3.5" />
        </Button>
      </footer>
      {dialog && data && (
        <ConnectionDialog {...dialog} connections={data.items} onClose={() => setDialog(null)} />
      )}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prepare your service connections</DialogTitle>
            <DialogDescription>
              Connect the services used at each stage of your workflow.
            </DialogDescription>
          </DialogHeader>
          <ol className="text-muted-foreground list-decimal space-y-3 pl-5 text-sm">
            <li>OpenAI supplies listing content; Replicate supplies image generation.</li>
            <li>Printify publishes products; Etsy publishes marketplace listings.</li>
            <li>
              Create a credential in your provider account with only the permissions your workflow
              needs.
            </li>
            <li>
              After connecting, validate the credential and check that its status is Connected.
            </li>
          </ol>
          <div className="bg-muted text-primary flex gap-2 rounded-lg p-3 text-xs">
            <ShieldCheck className="size-4 shrink-0" />
            Keep full credentials private. This page only displays masked values or your connected
            account name.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
