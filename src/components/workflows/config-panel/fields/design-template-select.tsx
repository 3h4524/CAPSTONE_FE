"use client";

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
    label: template.isSystemTemplate ? template.name : `${template.name} (mine)`,
    hint: [template.nicheCategory, template.artStyle].filter(Boolean).join(" · ") || (template.isSystemTemplate ? "System template" : "My template"),
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
        emptyMessage="No design templates are available yet."
      />
      {chosen && (
        <SourcePreview
          imageUrl={chosen.previewImageUrl}
          title={chosen.name}
          tags={[chosen.nicheCategory, chosen.artStyle, chosen.isSystemTemplate ? "System" : "Mine"].filter((tag): tag is string => Boolean(tag))}
          description={chosen.styleDescription}
        />
      )}
    </div>
  );
};
