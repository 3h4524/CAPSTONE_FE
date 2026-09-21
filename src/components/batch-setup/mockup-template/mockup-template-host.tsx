"use client";

import { useState } from "react";

import { MockupTemplatePickerDialog } from "@/components/batch-setup/mockup-template/mockup-template-picker-dialog";
import { MockupTemplateTrigger } from "@/components/batch-setup/mockup-template/mockup-template-trigger";
import { Input } from "@/components/ui/input";
import { useBatchMockupSelection } from "@/hooks/queries/use-batch-mockup-selection";

export const MockupTemplateHost = () => {
  const [open, setOpen] = useState(false);
  const [batchJobId, setBatchJobId] = useState("");
  const [productType, setProductType] = useState("");
  const { data: selection } = useBatchMockupSelection(batchJobId);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <Input placeholder="Batch job id" value={batchJobId} onChange={(event) => setBatchJobId(event.target.value.trim())} />
      <Input placeholder="Product type filter, empty for all" value={productType} onChange={(event) => setProductType(event.target.value.trim())} />
      <MockupTemplateTrigger selectedCount={selection?.templateIds.length ?? 0} onOpen={() => setOpen(true)} />
      <MockupTemplatePickerDialog
        batchJobId={batchJobId}
        productType={productType.length > 0 ? productType : undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </main>
  );
};
