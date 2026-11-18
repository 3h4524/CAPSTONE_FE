"use client";

import { useTranslation } from "react-i18next";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { SourcePreview } from "@/components/workflows/config-panel/fields/source-preview";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";

const TEMPLATE_PAGE_SIZE = 48;

type DesignTemplateSelectProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** For a dropdown outside a form, such as in a dialog: the id its label points to. */
  id?: string;
};

export const DesignTemplateSelect = ({ value, placeholder, onChange, id }: DesignTemplateSelectProps) => {
  const { t } = useTranslation("common");
  const {
    data: systemTemplates,
    isPending: isLoadingSystem,
    isError: isSystemError,
    refetch: refetchSystem,
  } = useDesignTemplates({ pageNumber: 1, pageSize: TEMPLATE_PAGE_SIZE, scope: "system" });
  const {
    data: personalTemplates,
    isPending: isLoadingPersonal,
    isError: isPersonalError,
    refetch: refetchPersonal,
  } = useDesignTemplates({ pageNumber: 1, pageSize: TEMPLATE_PAGE_SIZE, scope: "personal" });

  const templates = [...(personalTemplates?.items ?? []), ...(systemTemplates?.items ?? [])].filter(
    (template, index, list) => list.findIndex((item) => item.id === template.id) === index
  );
  const options = templates.map((template) => ({
    value: template.id,
    label: template.isSystemTemplate ? template.name : t("workflowConfig.fields.mineLabel", { name: template.name }),
    hint: [template.nicheCategory, template.artStyle].filter(Boolean).join(" · ") || (template.isSystemTemplate ? t("workflowConfig.fields.systemTemplate") : t("workflowConfig.fields.myTemplate")),
    imageUrl: template.previewImageUrl,
  }));
  const chosen = templates.find((template) => template.id === value);

  return (
    <div className="min-w-0 space-y-2">
      <OptionSelect
        value={value}
        options={options}
        placeholder={placeholder}
        onChange={onChange}
        standaloneId={id}
        isLoading={isLoadingSystem || isLoadingPersonal}
        isError={isSystemError && isPersonalError}
        onRetry={() => {
          void refetchSystem();
          void refetchPersonal();
        }}
        emptyMessage={t("workflowConfig.fields.noDesignTemplates")}
      />
      {chosen && (
        <SourcePreview
          imageUrl={chosen.previewImageUrl}
          title={chosen.name}
          tags={[chosen.nicheCategory, chosen.artStyle, chosen.isSystemTemplate ? t("workflowConfig.fields.system") : t("workflowConfig.fields.mine")].filter((tag): tag is string => Boolean(tag))}
          description={chosen.styleDescription}
        />
      )}
    </div>
  );
};
