"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/get-initials";

type AvatarCardProps = {
  avatarUrl: string | null;
  fullName: string;
  email: string;
};

export const AvatarCard = ({ avatarUrl, fullName, email }: AvatarCardProps) => {
  return (
    <div className="flex flex-col items-center gap-3 border-b px-6 py-6 text-center md:border-r md:border-b-0">
      <Avatar className="size-20 ring-1 ring-black/10">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
        <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
      </Avatar>
      <div className="w-full space-y-0.5">
        <p className="truncate text-base font-semibold">{fullName || "Your profile"}</p>
        <p className="text-muted-foreground truncate text-xs">{email}</p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled>
        Upload photo
      </Button>
      <p className="text-muted-foreground text-xs">
        JPG or PNG, up to 2 MB. Upload arrives with the Cloudinary integration.
      </p>
    </div>
  );
};
