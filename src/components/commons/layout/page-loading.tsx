import { Spinner } from "@/components/ui/spinner";

type PageLoadingProps = {
  label?: string;
};

export const PageLoading = ({ label = "Loading page" }: PageLoadingProps) => (
  <div
    role="status"
    aria-label={label}
    aria-live="polite"
    className="flex min-h-64 flex-1 items-center justify-center p-6"
  >
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="bg-muted text-primary flex size-12 items-center justify-center rounded-full">
        <Spinner className="size-5" />
      </div>
      <span className="text-muted-foreground text-sm">{label}…</span>
    </div>
  </div>
);
