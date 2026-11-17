"use client";

import { useState } from "react";
import { DatabaseZap, Lock, Plus } from "lucide-react";

import { AddKeyDialog, DeleteKeyDialog } from "@/components/admin/system-api-keys/key-dialogs";
import { ProviderSection } from "@/components/admin/system-api-keys/provider-section";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/helpers/error-message";
import { useAdminSystemApiKeys } from "@/hooks/queries/use-admin-system-api-keys";
import type { AdminSystemApiKey } from "@/types/admin-system-api-keys";

export const SystemApiKeysShell = () => {
  const { data, isPending, isError, error } = useAdminSystemApiKeys();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<AdminSystemApiKey | null>(null);
  const providers = data?.providers ?? [];

  return (
    <div className="flex flex-col gap-6 max-md:gap-4">
      <PageHeader
        title="Platform API keys"
        description="The platform's own Ideogram and MiniMax keys, used for plans that include them."
        actions={
          <Button type="button" onClick={() => setAdding(true)} disabled={!providers.length}>
            <Plus className="size-4" aria-hidden="true" />
            Add key
          </Button>
        }
      />

      <p className="text-muted-foreground flex items-start gap-2 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Keys are stored encrypted and never shown again. A change applies on this server at once and on the others within a minute.
      </p>

      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {getErrorMessage(error)}
        </p>
      ) : !data?.storageReady || providers.length === 0 ? (
        <div role="status" className="text-ink-600 flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm">
          <DatabaseZap className="text-ink-400 size-5" aria-hidden="true" />
          <p className="text-ink-800 font-medium">This database has no key tables yet.</p>
          <p className="max-w-xl">
            They are created by the migration <code className="font-mono text-xs">V202611161400__system_api_keys</code> when it is
            applied to this database. Until then the platform has no keys of its own, and images use the Seller&apos;s key.
          </p>
        </div>
      ) : (
        providers.map((provider) => <ProviderSection key={provider.provider} provider={provider} onDelete={setDeleting} />)
      )}

      <AddKeyDialog open={adding} providers={providers} onClose={() => setAdding(false)} />
      <DeleteKeyDialog apiKey={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
};
