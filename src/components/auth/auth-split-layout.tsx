import Image from "next/image";
import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  children: ReactNode;
  /** Optional caption overlaid on the image, bottom-anchored over a gradient scrim. */
  imageCaption?: {
    title: string;
    description: string;
  };
};

export const AuthSplitLayout = ({
  title,
  description,
  imageSrc,
  imageAlt,
  children,
  imageCaption,
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
          {imageCaption && (
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/20 to-transparent p-8 pt-16">
              <p className="font-display text-lg font-semibold text-white">{imageCaption.title}</p>
              <p className="mt-1 text-sm text-white/85">{imageCaption.description}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
