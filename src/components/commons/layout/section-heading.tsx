import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface SectionHeadingProps {
  title: string;
  description?: string;
  align?: "center" | "left";
  /** `h1` where the heading opens a page rather than a section. */
  level?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
}

/** Keeps hyphenated words such as "Etsy-ready" whole: a browser may otherwise break the line at the hyphen. */
const keepHyphenatedWordsWhole = (text: string) =>
  text.split(" ").map((word, index) => (
    <span key={index}>
      {index > 0 && " "}
      {word.includes("-") ? <span className="whitespace-nowrap">{word}</span> : word}
    </span>
  ));

/**
 * The title and lead-in every landing section opens with. The title runs wider than the
 * lead-in, so the block narrows downward instead of ending on its widest line.
 */
export const SectionHeading = ({
  title,
  description,
  align = "center",
  level: Heading = "h2",
  className,
  children,
}: SectionHeadingProps) => (
  <div
    className={cn(
      "flex flex-col",
      align === "center" ? "mx-auto max-w-3xl items-center text-center" : "items-start text-left",
      className
    )}
  >
    <Heading
      className={cn(
        "font-display text-brand-ink leading-tight font-bold tracking-tight text-balance",
        Heading === "h1" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
      )}
    >
      {keepHyphenatedWordsWhole(title)}
    </Heading>
    {description && (
      <p
        className={cn(
          "text-muted-foreground mt-4 max-w-2xl leading-relaxed text-balance",
          align === "center" && "mx-auto"
        )}
      >
        {description}
      </p>
    )}
    {children && <div className="mt-6">{children}</div>}
  </div>
);
