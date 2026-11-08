import { FlaskConical, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyRunsProps = {
  onUpload: () => void;
};

export const EmptyRuns = ({ onUpload }: EmptyRunsProps) => (
  <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-card px-6 py-14 text-center">
    <span className="flex size-10 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
      <FlaskConical className="size-5" />
    </span>
    <div>
      <p className="text-base font-semibold text-ink-900">No evaluation run yet</p>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-500">
        Score the images on the machine that has the offline scoring scripts,
        run the export step, then upload the file it writes.
      </p>
    </div>
    <Button type="button" onClick={onUpload} className="gap-2">
      <Upload className="size-4" />
      Upload results
    </Button>
  </section>
);
