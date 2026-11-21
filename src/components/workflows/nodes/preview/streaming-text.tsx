"use client";

type StreamingTextProps = {
  text: string;
  typing: boolean;
  className?: string;
};

export const StreamingText = ({ text, typing, className }: StreamingTextProps) => (
  <p className={className}>
    {text}
    {typing && (
      <span
        className="bg-wf-accent animate-wf-caret ml-px inline-block h-[1em] w-[1.5px] align-[-2px]"
        aria-hidden="true"
      />
    )}
  </p>
);
