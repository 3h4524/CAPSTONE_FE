"use client";

import { useEffect } from "react";

import { Container } from "@/components/commons/layout/container";
import { Button } from "@/components/ui/button";
import { Log } from "@/helpers/log";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfileError({ error, reset }: Props) {
  useEffect(() => {
    Log.error({ prefix: "profile/error", message: error.message, data: error });
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Could not load your profile</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Something went wrong while loading your profile. Try again, or come back later.
      </p>
      <Button onClick={reset}>Try again</Button>
    </Container>
  );
}
