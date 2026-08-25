import { Container } from "@/components/commons/layout/container";
import { SITE_CONFIG } from "@/constants/site";

export const HeroSection = () => (
  <section className="bg-hero-gradient">
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{SITE_CONFIG.name}</h1>
      <p className="text-muted-foreground max-w-xl text-lg">{SITE_CONFIG.description}</p>
    </Container>
  </section>
);
