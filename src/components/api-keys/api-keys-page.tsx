"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  BookOpen,
  Check,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
} from "lucide-react";

import { apiKeyKeys, validateApiKey } from "@/api/api-keys";
import { apiKeyError, ConnectionDialog } from "@/components/api-keys/connection-dialog";
import {
  ConnectionActions,
  ConnectionCredential,
  type ConnectionHandlers,
  ConnectionLastUsed,
  ConnectionProvider,
  ConnectionStatus,
} from "@/components/api-keys/connection-parts";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useApiKeys } from "@/hooks/queries/use-api-keys";
import { useIsPhone } from "@/hooks/use-is-phone";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAuthStore } from "@/stores/auth";
import type { ApiKeyConnection } from "@/types/api-keys";
import { cn } from "@/utils/cn";

// Mirrors the backend readiness rule: one Connected service per core pipeline stage.
const WORKFLOW_STAGES = [
  { category: "Listing content", provider: "gemini", providerName: "Google Gemini" },
  { category: "Image generation", provider: "ideogram", providerName: "Ideogram" },
  { category: "Product publishing", provider: "printify", providerName: "Printify" },
] as const;

type DialogState = {
  connection?: ApiKeyConnection;
  deleting?: boolean;
  initialProvider?: string;
};

function WorkflowReadiness({
  items,
  isReady,
  onConnect,
  onFix,
}: {
  items: ApiKeyConnection[];
  isReady: boolean;
  onConnect: (provider: string) => void;
  onFix: (connection: ApiKeyConnection) => void;
}) {
  const stages = WORKFLOW_STAGES.map((stage) => {
    const inStage = items.filter((item) => item.providerCategory === stage.category);
    const connected = inStage.filter((item) => item.status === "Connected");
    const broken = inStage.find((item) => item.status !== "Connected");
    return { ...stage, connected, broken };
  });
  const readyCount = stages.filter((stage) => stage.connected.length > 0).length;

  return (
    <section
      aria-label="Connection summary"
      className="bg-card mb-4 overflow-hidden rounded-xl border shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Workflow readiness</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isReady
              ? "Every stage has a working connection. You're ready to create and publish."
              : "Connect one working service for each stage to start creating products."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {stages.map((stage) => (
              <span
                key={stage.category}
                className={cn(
                  "h-1.5 w-6 rounded-full",
                  stage.connected.length > 0 ? "bg-success-text" : "bg-muted"
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              isReady ? "bg-success-background text-success-text" : "bg-amber-50 text-amber-800"
            )}
          >
            {readyCount}/{stages.length} ready
          </span>
        </div>
      </div>
      <ol className="grid border-t sm:grid-cols-3">
        {stages.map((stage, index) => {
          const ok = stage.connected.length > 0;
          return (
            <li
              key={stage.category}
              className={cn(
                "flex items-start gap-3 px-5 py-4",
                index > 0 && "border-t sm:border-t-0 sm:border-l"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  ok
                    ? "bg-success-background text-success-text"
                    : stage.broken
                      ? "bg-amber-50 text-amber-700"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {ok ? (
                  <Check className="size-3.5" aria-label="Ready" />
                ) : stage.broken ? (
                  <AlertTriangle className="size-3.5" aria-label="Needs attention" />
                ) : (
                  <span className="text-[10px] font-semibold">{index + 1}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{stage.category}</div>
                <div className="text-muted-foreground mt-0.5 truncate text-xs">
                  {ok
                    ? stage.connected.map((item) => item.provider).join(" · ")
                    : stage.broken
                      ? `${stage.broken.provider} needs attention`
                      : "Not connected"}
                </div>
                {!ok &&
                  (stage.broken && stage.broken.authType !== "OAuth" ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto px-0 text-xs"
                      onClick={() => onFix(stage.broken!)}
                    >
                      Fix {stage.broken.provider} key
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto px-0 text-xs"
                      onClick={() => onConnect(stage.provider)}
                    >
                      Connect {stage.providerName}
                    </Button>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type ConnectionViewProps = ConnectionHandlers & { connection: ApiKeyConnection; now: number };

function ConnectionRow({ connection, now, ...handlers }: ConnectionViewProps) {
  return (
    <tr
      className={cn(
        "border-border border-t transition-colors",
        connection.status === "Connected" ? "hover:bg-muted/30" : "bg-amber-50/40 hover:bg-amber-50/70"
      )}
    >
      <th scope="row" className="py-3.5 pr-3 pl-5 text-left font-normal">
        <ConnectionProvider connection={connection} labelClassName="max-w-52" />
      </th>
      <td className="px-3 py-3.5">
        <ConnectionCredential connection={connection} />
      </td>
      <td className="px-3 py-3.5">
        <ConnectionStatus connection={connection} now={now} />
      </td>
      <td className="text-muted-foreground px-3 py-3.5 whitespace-nowrap">
        <ConnectionLastUsed connection={connection} now={now} />
      </td>
      <td className="py-3.5 pr-5 pl-3">
        <ConnectionActions connection={connection} className="justify-end" {...handlers} />
      </td>
    </tr>
  );
}

function ConnectionCard({ connection, now, ...handlers }: ConnectionViewProps) {
  return (
    <li className={cn("border-border space-y-3 border-t p-4 text-xs", connection.status !== "Connected" && "bg-amber-50/40")}>
      <ConnectionProvider connection={connection} />
      <ConnectionCredential connection={connection} />
      <div>
        <ConnectionStatus connection={connection} now={now} />
      </div>
      <p className="text-muted-foreground">
        Last used: <ConnectionLastUsed connection={connection} now={now} />
      </p>
      <ConnectionActions connection={connection} {...handlers} />
    </li>
  );
}

export function ApiKeysPage() {
  const queryClient = useAppQueryClient();
  const isPhone = useIsPhone();
  const [dialog, setDialog] = useState<DialogState | null>(null);
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
  // Problems first so the rows that need action are seen without scrolling.
  const rows = data
    ? [...data.items].sort(
        (a, b) => Number(a.status === "Connected") - Number(b.status === "Connected")
      )
    : [];

  return (
    <div className="w-full min-w-0 md:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 max-md:mb-4 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-1">
        <div className="max-md:contents">
          <h1 className="font-display text-3xl font-semibold tracking-tight max-md:text-xl">API keys</h1>
          <p className="text-muted-foreground mt-1 text-sm max-md:hidden">
            Connect the services APCS uses to create and publish your products.
          </p>
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs max-md:col-span-2 max-md:mt-1">
            <LockKeyhole className="text-primary size-3.5 shrink-0" />
            <span className="text-foreground font-medium">Keys stay private.</span>
            Only masked credentials are shown here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-md:contents">
          <Button variant="ghost" size="sm" className="max-md:col-span-2 max-md:row-start-3 max-md:-ml-1 max-md:justify-self-start max-md:px-1" onClick={() => setGuideOpen(true)}>
            <BookOpen className="size-4" />
            Read setup guide
          </Button>
          <span className="max-md:col-start-2 max-md:row-start-1">
            <Button size="page-action" disabled={!query.data || forbidden || failed} onClick={() => setDialog({})}>
              <Plus className="size-4" />
              <span>
                Add<span className="max-md:hidden"> API key</span>
              </span>
            </Button>
          </span>
        </div>
      </header>

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
        <PageLoading label="Loading API keys" />
      ) : data ? (
        <>
          <WorkflowReadiness
            items={data.items}
            isReady={data.isReady}
            onConnect={(provider) => setDialog({ initialProvider: provider })}
            onFix={(connection) => setDialog({ connection })}
          />
          <section
            aria-labelledby="connected-services-title"
            className="bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <h2
                id="connected-services-title"
                className="flex items-center gap-2 text-base font-semibold"
              >
                Connected services
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
                  {data.items.length}
                </span>
              </h2>
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
            {rows.length === 0 ? (
              <div className="flex flex-col items-center border-t px-5 py-10 text-center">
                <div className="bg-primary/10 text-primary mb-3 flex size-11 items-center justify-center rounded-xl">
                  <KeyRound className="size-5" />
                </div>
                <h3 className="font-semibold">No API keys yet</h3>
                <p className="text-muted-foreground mt-1 text-sm md:hidden">Connect a service for each stage above to start creating products.</p>
                <span className="max-md:hidden">
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setDialog({})}>
                    <Plus className="size-4" />
                    Add API key
                  </Button>
                </span>
              </div>
            ) : isPhone ? (
              <ul>
                {rows.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    now={now}
                    onEdit={() => setDialog({ connection })}
                    onDelete={() => setDialog({ connection, deleting: true })}
                    onValidate={() => validation.mutate(connection.id)}
                    busy={validation.isPending}
                  />
                ))}
              </ul>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                  <caption className="sr-only">
                    Your service credentials, connection status, and last-used time
                  </caption>
                  <thead className="bg-muted/50 text-muted-foreground border-t text-left text-[10px] tracking-wider uppercase">
                    <tr>
                      {["Provider", "Credential", "Status", "Last used", "Actions"].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-3 py-2.5 font-medium first:pl-5 last:pr-5 last:text-right"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((connection) => (
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
          </section>
        </>
      ) : null}

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
            <li>Google Gemini supplies listing content; Gemini or Ideogram supplies design images.</li>
            <li>MiniMax H3 video generation uses the platform-managed system credential; Sellers do not add a MiniMax key here.</li>
            <li>Printify publishes products; Etsy publishes marketplace listings.</li>
            <li>
              Create a credential in your provider account with only the permissions your workflow
              needs.
            </li>
            <li>
              After connecting, validate the credential and check that its status is Connected.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
