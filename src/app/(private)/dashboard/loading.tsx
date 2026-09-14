import { Skeleton } from "@/components/ui/skeleton";

const DashboardLoading = () => {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-6 py-16 text-center">
      <Skeleton className="size-14 rounded-full" />
      <Skeleton className="h-7 w-52" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
};

export default DashboardLoading;
