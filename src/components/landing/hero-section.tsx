"use client";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/constants/site";
import { showToast } from "@/helpers/toast";
import { usePopupStore } from "@/stores/popup";

const DEMO_POPUP_OPTIONS = {
  title: "Delete product?",
  description: "This action cannot be undone. The product will be permanently removed.",
  positiveLabel: "Delete",
  negativeLabel: "Cancel",
  onPositive: () => showToast("success", "Product deleted"),
} as const;

export const HeroSection = () => {
  const openPopup = usePopupStore((state) => state.openPopup);

  return (
    <section className="bg-hero-gradient">
      <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{SITE_CONFIG.name}</h1>
        <p className="text-muted-foreground max-w-xl text-lg">{SITE_CONFIG.description}</p>
        <Button onClick={() => openPopup(DEMO_POPUP_OPTIONS)}>Open popup demo</Button>
      </Container>
    </section>
  );
};
