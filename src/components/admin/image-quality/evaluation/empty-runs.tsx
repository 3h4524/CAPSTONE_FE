import { FlaskConical, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyRunsProps = {
  onUpload: () => void;
};

export const EmptyRuns = ({ onUpload }: EmptyRunsProps) => (
  <section className="border-ink-300 bg-card flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
    <span className="bg-ink-100 text-ink-500 flex size-10 items-center justify-center rounded-lg">
      <FlaskConical className="size-5" />
    </span>
    <div>
      <p className="text-ink-900 text-base font-semibold">No evaluation run yet</p>
      <p className="text-ink-500 mt-1 max-w-md text-[13px] leading-relaxed">
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
