"use client";

import { type ReactNode, useState } from "react";
import { ImageIcon, Plus } from "lucide-react";

import type { MockupTemplateScope } from "@/api/mockup-templates";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { MockupCardGrid } from "@/components/mockups/mockup-card-grid";
import { MockupTemplateFormDialog } from "@/components/mockups/mockup-template-form-dialog";
import { MockupTemplateListItem } from "@/components/mockups/mockup-template-list-item";
import { Button } from "@/components/ui/button";
import { useDeleteMockupTemplate } from "@/hooks/mutations/use-delete-mockup-template";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplatesPanelProps = {
  /** A seller's own templates (beside the shared ones, which they only use), or the shared ones for an admin. */
  scope: MockupTemplateScope;
  /** More buttons beside "New template". */
  actions?: ReactNode;
  /** More buttons on a template's card. */
  cardActions?: (template: MockupTemplate) => ReactNode;
};

/** The product-photo templates one can manage, with a form to make and change them. */
export const MockupTemplatesPanel = ({ scope, actions, cardActions }: MockupTemplatesPanelProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MockupTemplate | null>(null);
  const { data: templates, isPending: isLoadingTemplates, isError: isTemplatesError, refetch: refetchTemplates } = useMockupTemplates(undefined, true, scope);
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteMockupTemplate(scope);
  const openPopup = usePopupStore((state) => state.openPopup);
  const canChange = (template: MockupTemplate) => (scope === "admin" ? template.isSystemTemplate : template.isMine);

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
      description:
        scope === "admin"
          ? "Sellers can no longer choose it. Mock-ups already made on it stay as they are."
          : "This removes the mock-up template permanently. System templates cannot be deleted.",
      positiveLabel: "Delete",
      onPositive: () => deleteTemplate(template.id),
    });
  };

  return (
    <div className="flex flex-col gap-4 max-md:gap-3">
      <div className="flex flex-wrap justify-end gap-2 max-md:grid max-md:grid-cols-1">
        {actions}
        <Button type="button" className="max-md:w-full" onClick={openCreate} disabled={isDeleting}>
          <Plus aria-hidden="true" />
          New template
        </Button>
      </div>
      {isLoadingTemplates ? (
        <SectionLoading label="Loading mock-up templates" />
      ) : isTemplatesError || !templates ? (
        <div className="border-ink-200 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center" role="alert">
          <ImageIcon className="text-ink-400 size-8" aria-hidden="true" />
          <div>
            <p className="text-ink-900 font-semibold">Mock-up templates unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">We could not load mock-up templates. Check your connection and try again.</p>
          </div>
          <Button type="button" onClick={() => refetchTemplates()}>
            Try again
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <div className="border-ink-300 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-ink-900 font-semibold">No mock-up templates yet</p>
          <p className="text-muted-foreground text-sm">Upload a product photo to start compositing designs onto it.</p>
          <Button type="button" onClick={openCreate}>
            New template
          </Button>
        </div>
      ) : (
        <MockupCardGrid
          items={templates}
          pagerLabel="Mock-up template pages"
          className="xl:grid-cols-4"
          renderItem={(template) => (
            <MockupTemplateListItem
              key={template.id}
              template={template}
              busy={isDeleting}
              editable={canChange(template)}
              onEdit={openEdit}
              onDelete={askDelete}
              extraActions={cardActions?.(template)}
            />
          )}
        />
      )}
      <MockupTemplateFormDialog open={dialogOpen} template={editingTemplate} onClose={() => setDialogOpen(false)} scope={scope} />
    </div>
  );
};
