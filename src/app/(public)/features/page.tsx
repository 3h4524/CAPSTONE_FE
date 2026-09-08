import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { getPageMetadata } from "@/data/metadata";

export const generateMetadata = (): Metadata =>
  getPageMetadata({
    title: "Features",
    description:
      "Explore APCS features in detail: AI design generation, video creation, Etsy listing content, batch processing, and platform integrations.",
    pathname: "/features",
  });

const FeaturesPage = () => {
  return (
    <main className="py-16 md:py-24">
      <Container className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="text-primary text-xs font-semibold tracking-widest uppercase">
          Features
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance md:text-5xl">
          A closer look at every APCS feature
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Detailed breakdowns of AI design generation, video creation, Etsy
          listing content, batch processing, and platform integrations are
          coming soon.
        </p>
        <Button variant="outline" size="lg" asChild>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back to home
          </Link>
        </Button>
      </Container>
    </main>
  );
};

export default FeaturesPage;
