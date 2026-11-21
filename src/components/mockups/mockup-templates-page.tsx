"use client";

import { ImageIcon, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
import { GuideReplayButton } from "@/components/commons/onboarding/guide-replay-button";
import { PageGuide } from "@/components/commons/onboarding/page-guide";
import { MockupTemplatesPanel } from "@/components/mockups/mockup-templates-panel";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const MockupTemplatesPage = () => {
  const { t } = useTranslation("common");

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 max-md:gap-3 md:p-6">
      <div data-guide="mockups.header">
        <PageHeader
          title={t("mockups.templatesPage.title")}
          description={t("mockups.templatesPage.description")}
          actions={<GuideReplayButton guideKey="mockups" className="max-md:hidden" />}
        />
      </div>
      <PageGuide guideKey="mockups" />
      <Tabs defaultValue="templates" className="gap-5 max-md:gap-3">
        <TabsList className="w-full sm:w-fit" data-guide="mockups.tabs">
          <TabsTrigger value="templates" className="px-4">
            <ImageIcon aria-hidden="true" />
            {t("mockups.templatesPage.productPhotosTab")}
          </TabsTrigger>
          <TabsTrigger value="models" className="px-4" data-guide="mockups.models">
            <UserRound aria-hidden="true" />
            {t("mockups.templatesPage.modelPhotosTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <div data-guide="mockups.templates">
            <MockupTemplatesPanel scope="seller" />
          </div>
        </TabsContent>
        <TabsContent value="models">
          <ModelPhotosPanel scope="seller" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
