"use client";

import { useMemo, useState } from "react";

import { ComparisonTable } from "@/components/admin/image-quality/evaluation/comparison-table";
import { HeadlineCards } from "@/components/admin/image-quality/evaluation/headline-cards";
import { ImageGallery } from "@/components/admin/image-quality/evaluation/image-gallery";
import { VersionPicker } from "@/components/admin/image-quality/evaluation/version-picker";
import { VersionProgress } from "@/components/admin/image-quality/evaluation/version-progress";
import {
  compareImageEvalVersions,
  getDefaultImageEvalSelection,
  getImageEvalPresets,
} from "@/helpers/image-eval-comparison";
import { getImageEvalVersionStats } from "@/helpers/image-eval-version-stats";
import type { ImageEvalRunDetail } from "@/types/admin-image-quality";

type RunComparisonProps = {
  run: ImageEvalRunDetail;
};

export const RunComparison = ({ run }: RunComparisonProps) => {
  const [selection, setSelection] = useState(() => getDefaultImageEvalSelection(run.versions));

  const presets = useMemo(() => getImageEvalPresets(run.versions), [run.versions]);
  const comparison = useMemo(
    () => compareImageEvalVersions(run.images, run.versions, selection),
    [run.images, run.versions, selection]
  );
  const versionStats = useMemo(
    () => getImageEvalVersionStats(run.images, run.versions),
    [run.images, run.versions]
  );

  return (
    <div className="flex flex-col gap-5">
      <VersionPicker
        versions={run.versions}
        presets={presets}
        selection={selection}
        onChange={setSelection}
      />
      <HeadlineCards comparison={comparison} />
      <ComparisonTable comparison={comparison} />
      <VersionProgress stats={versionStats} />
      <ImageGallery comparison={comparison} versions={run.versions} />
    </div>
  );
};
