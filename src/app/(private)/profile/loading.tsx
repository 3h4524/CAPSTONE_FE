import { Skeleton } from "@/components/ui/skeleton";

const ProfileLoading = () => {
  return (
    <div>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid md:grid-cols-[15rem_1fr]">
        <div className="flex flex-col items-center gap-3 border-b px-6 py-6 md:border-r md:border-b-0">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid content-start gap-x-6 gap-y-5 px-6 py-5 xl:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileLoading;
