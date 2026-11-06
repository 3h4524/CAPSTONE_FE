"use client";

type KeywordUseProps = {
  motifs?: string | null;
  ignoredKeywords?: string[] | null;
};

/** What the design draws from the product's keywords and what it leaves out, as the server sorted them. */
export const KeywordUse = ({ motifs, ignoredKeywords }: KeywordUseProps) => {
  // A product with its own image prompt draws on no keywords.
  if (motifs == null) return null;

  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold tracking-wide text-slate-500 uppercase">From the product&apos;s keywords</p>
      <p>
        <span className="text-muted-foreground">Drawn: </span>
        {motifs.length > 0 ? motifs : "Nothing"}
      </p>
      {ignoredKeywords && ignoredKeywords.length > 0 && (
        <p>
          <span className="text-muted-foreground">Left out: </span>
          {ignoredKeywords.join(", ")}
        </p>
      )}
      <p className="text-muted-foreground">
        Keywords are used as written, less words for the product or its listing (shirt, mug, gift…) and words the printed phrase
        already says. Edit the product&apos;s keywords to change this.
      </p>
    </div>
  );
};
