import { Container } from "@/components/commons/layout/container";
import { FOOTER_CONTENT } from "@/data/landing-content";

export const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <Container className="flex flex-col items-center justify-between gap-4 py-8 text-center md:flex-row md:text-left">
        <span className="font-display text-lg font-bold tracking-tight">
          {FOOTER_CONTENT.brand}
        </span>
        <p className="text-muted-foreground text-sm">
          © {year} {FOOTER_CONTENT.copyright}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
          {FOOTER_CONTENT.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors focus-visible:underline focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </Container>
    </footer>
  );
};
