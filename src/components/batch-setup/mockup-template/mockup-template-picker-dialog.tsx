"use client";

import { ImageIcon } from "lucide-react";

import { MockupTemplatePickerContent } from "@/components/batch-setup/mockup-template/mockup-template-picker-content";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApplyMockupTemplates } from "@/hooks/mutations/use-apply-mockup-templates";
import { useBatchMockupSelection } from "@/hooks/queries/use-batch-mockup-selection";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";

type MockupTemplatePickerDialogProps = {
  batchJobId: string;
  productType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const MockupTemplatePickerDialog = ({ batchJobId, productType, open, onOpenChange }: MockupTemplatePickerDialogProps) => {
  const { data: templates, isPending: isLoadingTemplates, isError: isTemplatesError, refetch: refetchTemplates } = useMockupTemplates(productType, open);
  const { data: selection, isPending: isLoadingSelection } = useBatchMockupSelection(batchJobId, open);
  const { mutate: applyMockups, isPending: isApplying } = useApplyMockupTemplates();

  const close = () => onOpenChange(false);
  const loading = isLoadingTemplates || isLoadingSelection;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>Choose mock-up templates</DialogTitle>
          <DialogDescription>Tick the mock-ups every design in this batch will be rendered on.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <SectionLoading label="Loading mock-up templates" />
        ) : isTemplatesError || !templates ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
            <ImageIcon className="size-8 text-slate-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">Mock-up templates unavailable</p>
              <p className="text-muted-foreground mt-1 text-sm">We could not load mock-up templates. Check your connection and try again.</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>Close</Button>
              <Button type="button" onClick={() => refetchTemplates()}>Try again</Button>
            </div>
          </div>
        ) : (
          <MockupTemplatePickerContent
            templates={templates}
            initialIds={selection?.templateIds ?? []}
            pending={isApplying}
            onApply={(templateIds) => applyMockups({ batchJobId, templateIds }, { onSuccess: close })}
            onClose={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
