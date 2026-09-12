"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/get-initials";

type UserAvatarProps = {
  size?: "default" | "sm" | "lg";
  className?: string;
};

const SKELETON_SIZES = {
  sm: "size-6",
  default: "size-8",
  lg: "size-10",
} as const;

export const UserAvatar = ({ size = "default", className }: UserAvatarProps) => {
  const user = useUserStore((state) => state.user);

  if (!user) {
    return <Skeleton className={cn("rounded-full", SKELETON_SIZES[size], className)} />;
  }

  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
      <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
    </Avatar>
  );
};
