import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </Container>
  );
}
