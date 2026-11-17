"use client";

import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
import { ModelPhotosPanel } from "@/components/mockups/model-photos-panel";

export const ModelPhotoLibrary = () => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.mockups.modelPhotos.title")}
        description={t("admin.mockups.modelPhotos.description")}
      />
      <ModelPhotosPanel scope="admin" />
    </div>
  );
};
