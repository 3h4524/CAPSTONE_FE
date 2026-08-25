import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

type ContainerProps = ComponentProps<"div">;

export const Container = ({ className, ...props }: ContainerProps) => (
  <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />
);
