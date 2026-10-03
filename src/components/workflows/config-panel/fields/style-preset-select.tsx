"use client";

import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { useStylePresets } from "@/hooks/queries/use-style-presets";

type StylePresetSelectProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export const StylePresetSelect = ({ value, placeholder, onChange }: StylePresetSelectProps) => {
  const { data: presets, isPending, isError, refetch } = useStylePresets();
  const options = (presets ?? []).map((preset) => ({ value: preset.id, label: preset.name }));

  return (
    <OptionSelect
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      isLoading={isPending}
      isError={isError}
      onRetry={() => refetch()}
      emptyMessage="No art styles are available yet."
    />
  );
};
