"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";
import { getInitials } from "@/utils/get-initials";

type UserAvatarProps = {
  size?: "default" | "sm" | "lg";
  className?: string;
  /** The phone header's look: one letter on the accent color. */
  accent?: boolean;
};

const AVATAR_SIZES = {
  sm: "size-6",
  default: "size-8",
  lg: "size-10",
} as const;

export const UserAvatar = ({ size = "default", className, accent = false }: UserAvatarProps) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return (
      <span
        className={cn(
          "bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full",
          AVATAR_SIZES[size],
          className
        )}
      >
        <Spinner className="size-4" aria-label="Loading account" />
      </span>
    );
  }

  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
      <AvatarFallback className={cn(accent && "bg-primary text-primary-foreground text-xs font-semibold")}>
        {accent ? getInitials(user.fullName).slice(0, 1) : getInitials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  );
};
