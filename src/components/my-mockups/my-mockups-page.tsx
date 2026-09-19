"use client";

import { useState } from "react";
import { ImageIcon, Plus } from "lucide-react";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { MockupTemplateFormDialog } from "@/components/my-mockups/mockup-template-form-dialog";
import { MockupTemplateListItem } from "@/components/my-mockups/mockup-template-list-item";
import { Button } from "@/components/ui/button";
import { useDeleteMockupTemplate } from "@/hooks/mutations/use-delete-mockup-template";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate } from "@/types/mockup-templates";

export const MyMockupsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MockupTemplate | null>(null);
  const { data: templates, isPending: isLoadingTemplates, isError: isTemplatesError, refetch: refetchTemplates } = useMockupTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteMockupTemplate();
  const openPopup = usePopupStore((state) => state.openPopup);

  const openCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEdit = (template: MockupTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const askDelete = (template: MockupTemplate) => {
    openPopup({
      title: `Delete ${template.name}?`,
      description: "This removes the template permanently. Templates already used cannot be deleted.",
      positiveLabel: "Delete",
      onPositive: () => deleteTemplate(template.id),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My Mock-ups</h1>
          <p className="text-muted-foreground mt-1 text-sm">Browse system templates and manage templates you created.</p>
        </div>
        <Button type="button" onClick={openCreate} disabled={isDeleting}>
          <Plus aria-hidden="true" />
          New template
        </Button>
      </div>
      {isLoadingTemplates ? (
        <SectionLoading label="Loading mock-up templates" />
      ) : isTemplatesError || !templates ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-8 text-center" role="alert">
          <ImageIcon className="size-8 text-slate-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">Mock-up templates unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">We could not load mock-up templates. Check your connection and try again.</p>
          </div>
          <Button type="button" onClick={() => refetchTemplates()}>Try again</Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-semibold text-slate-900">No mock-up templates yet</p>
          <p className="text-muted-foreground text-sm">Create your first template to render designs on.</p>
          <Button type="button" onClick={openCreate}>New template</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <MockupTemplateListItem key={template.id} template={template} busy={isDeleting} onEdit={openEdit} onDelete={askDelete} />
          ))}
        </div>
      )}
      <MockupTemplateFormDialog open={dialogOpen} template={editingTemplate} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
