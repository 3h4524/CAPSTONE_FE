"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

type UnauthorizedPageProps = {
  dashboardHref: string;
};

export const UnauthorizedPage = ({ dashboardHref }: UnauthorizedPageProps) => {
  const { t } = useTranslation("common");

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <section className="border-border bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm md:p-10">
        <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-full">
          <ShieldAlert className="size-7" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground mt-6 text-xs font-semibold tracking-[0.2em] uppercase">
          403
        </p>
        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
          {t("errors.unauthorizedTitle")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
          {t("errors.unauthorizedDescription")}
        </p>
        <Button asChild className="mt-7">
          <Link href={dashboardHref}>{t("errors.goToDashboard")}</Link>
        </Button>
      </section>
    </main>
  );
};
