import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentSubscription } from "@/types/subscription";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

type CurrentPlanCardProps = {
  subscription: CurrentSubscription | null;
};

export const CurrentPlanCard = ({ subscription }: CurrentPlanCardProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Current plan
          </p>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">
              {subscription ? subscription.planName : "No Active Subscription"}
            </h3>
            <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
              {subscription ? subscription.status : "No plan"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {subscription
              ? subscription.shortDescription
              : "You currently do not have an active subscription. Choose a plan below to unlock credits and features."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {subscription ? formatCurrency(subscription.price) : "$0"}
            <span className="text-muted-foreground text-sm font-normal">
              {" "}
              / {subscription?.billingCycle === "annual" ? "year" : "month"}
            </span>
          </p>
          <p className="text-muted-foreground text-sm">
            {subscription ? `Renews ${formatDate(subscription.renewalDate)}` : "Choose a plan to start"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
