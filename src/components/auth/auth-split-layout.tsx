import type { ReactNode } from "react";
import Image from "next/image";

type AuthSplitLayoutProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  children: ReactNode;
};

export const AuthSplitLayout = ({
  title,
  description,
  imageSrc,
  imageAlt,
  children,
}: AuthSplitLayoutProps) => {
  return (
    <main className="flex min-h-[75vh] items-center justify-center px-4 py-10 sm:py-16">
      <div className="border-border bg-card grid w-full max-w-5xl overflow-hidden rounded-2xl border shadow-xl lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
          {children}
        </div>
        <div className="relative hidden lg:block">
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" sizes="50vw" />
        </div>
      </div>
    </main>
  );
};
