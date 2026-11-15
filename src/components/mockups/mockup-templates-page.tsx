"use client";

import { useState } from "react";
import { ImageIcon, Plus, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { MockupCardGrid } from "@/components/mockups/mockup-card-grid";
import { MockupTemplateFormDialog } from "@/components/mockups/mockup-template-form-dialog";
import { MockupTemplateListItem } from "@/components/mockups/mockup-template-list-item";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteMockupTemplate } from "@/hooks/mutations/use-delete-mockup-template";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { usePopupStore } from "@/stores/popup";
import type { MockupTemplate } from "@/types/mockup-templates";

export const MockupTemplatesPage = () => {
  const { t } = useTranslation("common");
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
      title: t("mockups.templatesPage.deleteTitle", { name: template.name }),
      description: t("mockups.templatesPage.deleteDescription"),
      positiveLabel: t("mockups.delete"),
      onPositive: () => deleteTemplate(template.id),
    });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 max-md:gap-3 md:p-6">
      <PageHeader
        title={t("mockups.templatesPage.title")}
        description={t("mockups.templatesPage.description")}
      />
      <Tabs defaultValue="templates" className="gap-5 max-md:gap-3">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="templates" className="px-4">
            <ImageIcon aria-hidden="true" />
            {t("mockups.templatesPage.productPhotosTab")}
          </TabsTrigger>
          <TabsTrigger value="models" className="px-4">
            <UserRound aria-hidden="true" />
            {t("mockups.templatesPage.modelPhotosTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="flex flex-col gap-4 max-md:gap-3">
          <div className="flex justify-end">
            <Button type="button" className="max-md:w-full" onClick={openCreate} disabled={isDeleting}>
              <Plus aria-hidden="true" />
              {t("mockups.templatesPage.newTemplate")}
            </Button>
          </div>
          {isLoadingTemplates ? (
            <SectionLoading label={t("mockups.templatesPage.loadingTemplates")} />
          ) : isTemplatesError || !templates ? (
            <div className="border-ink-200 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center" role="alert">
              <ImageIcon className="text-ink-400 size-8" aria-hidden="true" />
              <div>
                <p className="text-ink-900 font-semibold">{t("mockups.templatesPage.unavailableTitle")}</p>
                <p className="text-muted-foreground mt-1 text-sm">{t("mockups.templatesPage.unavailableDescription")}</p>
              </div>
              <Button type="button" onClick={() => refetchTemplates()}>{t("mockups.templatesPage.tryAgain")}</Button>
            </div>
          ) : templates.length === 0 ? (
            <div className="border-ink-300 bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
              <p className="text-ink-900 font-semibold">{t("mockups.templatesPage.noTemplatesTitle")}</p>
              <p className="text-muted-foreground text-sm">{t("mockups.templatesPage.noTemplatesDescription")}</p>
              <Button type="button" onClick={openCreate}>{t("mockups.templatesPage.newTemplate")}</Button>
            </div>
          ) : (
            <MockupCardGrid
              items={templates}
              pagerLabel={t("mockups.cardGrid.pageLabel")}
              className="xl:grid-cols-4"
              renderItem={(template) => (
                <MockupTemplateListItem key={template.id} template={template} busy={isDeleting} onEdit={openEdit} onDelete={askDelete} />
              )}
            />
          )}
        </TabsContent>
        <TabsContent value="models">
          <ModelPhotosPanel scope="seller" />
        </TabsContent>
      </Tabs>
      <MockupTemplateFormDialog open={dialogOpen} template={editingTemplate} onClose={() => setDialogOpen(false)} />
    </div>
  );
};
