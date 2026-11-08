import { formatImageQualityPercent } from "@/helpers/image-quality-format";

type RateMeterProps = {
  value: number | null;
  caption?: string;
};

const PERCENT = 100;

export const RateMeter = ({ value, caption }: RateMeterProps) => {
  if (value === null) {
    return <span className="text-sm text-ink-400">–</span>;
  }

  const label = formatImageQualityPercent(value);

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      aria-valuenow={Math.round(value * PERCENT)}
      aria-label={caption ? `${label} (${caption})` : label}
      className="relative h-7 min-w-36 overflow-hidden rounded-md bg-ink-100"
    >
      <div
        className="absolute inset-y-0 left-0 border-r-2 border-sky-700 bg-sky-100 dark:bg-sky-500/15"
        style={{ width: `${value * PERCENT}%` }}
      />
      <span className="relative flex h-full items-center gap-2 px-2.5 font-mono text-xs font-medium text-ink-800">
        {label}
        {caption ? <span className="font-normal text-ink-500">{caption}</span> : null}
      </span>
    </div>
  );
};
