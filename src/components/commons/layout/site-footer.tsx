"use client";

import { useTranslation } from "react-i18next";

import { Logo } from "@/components/commons/icons/logo";
import { Container } from "@/components/commons/layout/container";
import { FOOTER_CONTENT } from "@/data/landing-content";

export const SiteFooter = () => {
  const { t } = useTranslation("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <Container className="flex flex-col items-center justify-between gap-4 py-8 text-center md:flex-row md:text-left">
        <span className="font-display text-brand-ink flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden="true" className="flex shrink-0">
            <Logo height={28} width={28} />
          </span>
          {FOOTER_CONTENT.brand}
        </span>
        <p className="text-muted-foreground text-sm">
          © {year} {t("commons.siteFooter.copyright", { defaultValue: FOOTER_CONTENT.copyright })}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label={t("commons.siteFooter.label")}>
          {FOOTER_CONTENT.links.map((link, index) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors focus-visible:underline focus-visible:outline-none"
            >
              {t(`commons.siteFooter.links.${index}`, { defaultValue: link.label })}
            </a>
          ))}
        </nav>
      </Container>
    </footer>
  );
};
