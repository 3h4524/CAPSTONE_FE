"use client";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { useDesignTemplates } from "@/hooks/queries/use-design-templates";

const TEMPLATE_PAGE_SIZE = 48;

type DesignTemplateSelectProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export const DesignTemplateSelect = ({ value, placeholder, onChange }: DesignTemplateSelectProps) => {
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

  const templates = [...(personalTemplates?.items ?? []), ...(systemTemplates?.items ?? [])];
  const options = templates
    .filter((template, index) => templates.findIndex((item) => item.id === template.id) === index)
    .map((template) => ({
      value: template.id,
      label: template.isSystemTemplate ? template.name : `${template.name} (mine)`,
    }));

  return (
    <OptionSelect
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      isLoading={isLoadingSystem || isLoadingPersonal}
      isError={isSystemError && isPersonalError}
      onRetry={() => {
        void refetchSystem();
        void refetchPersonal();
      }}
      emptyMessage="No design templates are available yet."
    />
  );
};
