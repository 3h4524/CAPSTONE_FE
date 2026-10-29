"use client";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { SourcePreview } from "@/components/workflows/config-panel/fields/source-preview";
import { useStylePresets } from "@/hooks/queries/use-style-presets";

type StylePresetSelectProps = {
  value: string;
  placeholder: string;
  noneLabel?: string;
  onChange: (value: string) => void;
  /** For a dropdown outside a form, such as in a dialog: the id its label points to. */
  id?: string;
};

export const StylePresetSelect = ({ value, placeholder, noneLabel, onChange, id }: StylePresetSelectProps) => {
  const { data: presets, isPending, isError, refetch } = useStylePresets();
  const options = (presets ?? []).map((preset) => ({
    value: preset.id,
    label: preset.name,
    hint: preset.description || undefined,
    imageUrl: preset.previewImageUrl,
  }));
  const chosen = presets?.find((preset) => preset.id === value);

  return (
    <div className="min-w-0 space-y-2">
      <OptionSelect
        value={value}
        options={options}
        placeholder={placeholder}
        noneLabel={noneLabel}
        onChange={onChange}
        standaloneId={id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage="No art styles are available yet."
      />
      {chosen && (
        <SourcePreview
          imageUrl={chosen.previewImageUrl}
          title={chosen.name}
          tags={chosen.recommendations.slice(0, 3)}
          description={chosen.description || null}
        />
      )}
    </div>
  );
};
