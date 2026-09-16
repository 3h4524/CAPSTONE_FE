import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";

type SectionLoadingProps = {
  label?: string;
  className?: string;
};

export const SectionLoading = ({ label = "Loading", className }: SectionLoadingProps) => (
  <div
    role="status"
    aria-label={label}
    className={cn("flex items-center justify-center gap-2 p-6", className)}
  >
    <Spinner className="size-5" aria-hidden="true" />
    <span className="text-muted-foreground text-sm">{label}…</span>
  </div>
);
