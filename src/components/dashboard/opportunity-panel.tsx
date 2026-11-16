"use client";

import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

import { OpportunityRow } from "@/components/dashboard/opportunity-row";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useRankDashboardOpportunities } from "@/hooks/mutations/use-rank-dashboard-opportunities";
import { useDashboardOpportunities } from "@/hooks/queries/use-dashboard-opportunities";

/** The niches Market Radar ranks best for the Seller, so they know what to make next. */
export const OpportunityPanel = () => {
  const { t } = useTranslation("common");
  const { data: opportunities, isPending: isLoading } = useDashboardOpportunities();
  const { mutate: rankOpportunities, isPending: isRanking } = useRankDashboardOpportunities();
  const hasOpportunities = (opportunities?.length ?? 0) > 0;

  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle className="text-sm">{t("dashboard.opportunities.title")}</CardTitle>
        <CardDescription className="text-xs">{t("dashboard.opportunities.description")}</CardDescription>
        {hasOpportunities && (
          <CardAction>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link href="/market-opportunities">
                {t("dashboard.opportunities.seeAll")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("dashboard.opportunities.loading")}</p>
        ) : hasOpportunities ? (
          <ul className="divide-y">
            {opportunities?.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              {t("dashboard.opportunities.empty")}
            </p>
            <Button size="sm" disabled={isRanking} onClick={() => rankOpportunities(undefined)}>
              {isRanking ? (
                <Spinner className="size-3.5" />
              ) : (
                <Compass className="size-3.5" aria-hidden="true" />
              )}
              {isRanking ? t("dashboard.opportunities.ranking") : t("dashboard.opportunities.find")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
