"use client";

import { useState } from "react";

import { EditDesignPromptDialog } from "@/components/batch-config/edit-design-prompt/edit-design-prompt-dialog";
import { EditDesignPromptTrigger } from "@/components/batch-config/edit-design-prompt/edit-design-prompt-trigger";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Input } from "@/components/ui/input";
import { useBatchProductPrompt } from "@/hooks/queries/use-batch-product-prompt";

export const EditDesignPromptHost = () => {
  const [open, setOpen] = useState(false);
  const [rowId, setRowId] = useState("");
  const { data: prompt } = useBatchProductPrompt(rowId, rowId.length > 0);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <PageHeader title="Prompt editor" className="sr-only" />
      <Input placeholder="Batch row id" value={rowId} onChange={(event) => setRowId(event.target.value.trim())} />
      <div className="flex items-center gap-2">
        <EditDesignPromptTrigger canEdit={prompt?.canEdit ?? false} onOpen={() => setOpen(true)} />
        <span className="text-muted-foreground text-xs">{prompt ? (prompt.isCustomized ? "customized" : "default") : "no row loaded"}</span>
      </div>
      <EditDesignPromptDialog rowId={rowId} open={open} onOpenChange={setOpen} />
    </main>
  );
};
