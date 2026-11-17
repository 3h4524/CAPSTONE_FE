"use client";

import { useTranslation } from "react-i18next";

type KeywordUseProps = {
  motifs?: string | null;
  ignoredKeywords?: string[] | null;
};

/** What the design draws from the product's keywords and what it leaves out, as the server sorted them. */
export const KeywordUse = ({ motifs, ignoredKeywords }: KeywordUseProps) => {
  const { t } = useTranslation("common");
  // A product with its own image prompt draws on no keywords.
  if (motifs == null) return null;

  return (
    <div className="space-y-1 text-xs">
      <p className="text-ink-500 font-semibold tracking-wide uppercase">{t("batchConfig.keywords.title")}</p>
      <p>
        <span className="text-muted-foreground">{t("batchConfig.keywords.drawn")} </span>
        {motifs.length > 0 ? motifs : t("batchConfig.keywords.nothing")}
      </p>
      {ignoredKeywords && ignoredKeywords.length > 0 && (
        <p>
          <span className="text-muted-foreground">{t("batchConfig.keywords.leftOut")} </span>
          {ignoredKeywords.join(", ")}
        </p>
      )}
      <p className="text-muted-foreground">
        {t("batchConfig.keywords.hint")}
      </p>
    </div>
  );
};
