import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentSubscription } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days left, rounded up, so a trial ending later today still shows "1 day left".
export const trialDaysLeft = (trialEndsAt: string, now: number = Date.now()) =>
  Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / MS_PER_DAY));

type CurrentPlanCardProps = {
  subscription: CurrentSubscription | null;
  onCancelScheduledDowngrade: () => void;
  isCancellingScheduledDowngrade: boolean;
  onRenewClick: () => void;
};

export const CurrentPlanCard = ({
  subscription,
  onCancelScheduledDowngrade,
  isCancellingScheduledDowngrade,
  onRenewClick,
}: CurrentPlanCardProps) => {
  const isTrial = subscription?.isTrial === true && subscription.trialEndsAt !== null;
  const daysLeft = isTrial ? trialDaysLeft(subscription.trialEndsAt!) : 0;
  const isPastDue = subscription?.status === "past_due";

  return (
    <Card className="max-md:py-4">
      <CardContent className="flex flex-col justify-between gap-4 max-md:gap-3 max-md:px-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Current plan
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              {subscription ? subscription.planName : "Free"}
            </h3>
            {isTrial ? (
              <Badge variant="secondary">
                Trial · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </Badge>
            ) : isPastDue ? (
              <Badge variant="destructive">Payment due</Badge>
            ) : (
              <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
                {subscription ? subscription.status : "No plan"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm max-md:hidden">
            {isTrial
              ? `You're trying every ${subscription!.planName} feature for free. Choose a plan before ${formatDate(subscription!.trialEndsAt!)} to keep running your workflows.`
              : subscription
                ? subscription.shortDescription
                : "You can build and save workflows on Free. Start the free trial or choose a plan to run them."}
          </p>
          {isPastDue && subscription!.lastGraceDay && (
            <div
              role="alert"
              className="border-destructive/40 bg-destructive/10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                Your renewal was due {formatDate(subscription!.renewalDate)}. Renew by{" "}
                <strong>{formatDate(subscription!.lastGraceDay)}</strong> to keep {subscription!.planName}; after that
                your account moves to Free.
              </span>
              <Button size="sm" onClick={onRenewClick}>
                Renew now
              </Button>
            </div>
          )}
          {subscription?.scheduledPlanName && subscription.scheduledPlanEffectiveDate && (
            <div className="border-warning bg-warning/10 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span>
                Moving to <strong>{subscription.scheduledPlanName}</strong> when you renew on{" "}
                {formatDate(subscription.scheduledPlanEffectiveDate)}.
              </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={onCancelScheduledDowngrade}
                disabled={isCancellingScheduledDowngrade}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="text-right max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:text-left">
          <p className="text-2xl font-bold max-md:text-lg">
            {isTrial ? "Free trial" : subscription ? formatVnd(subscription.priceVnd) : "0 ₫"}
            {!isTrial && (
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {subscription?.billingCycle === "annual" ? "year" : "month"}
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-sm">
            {isTrial
              ? `Ends ${formatDate(subscription!.trialEndsAt!)}`
              : isPastDue
                ? `Was due ${formatDate(subscription!.renewalDate)}`
                : subscription
                  ? `Paid until ${formatDate(subscription.renewalDate)}`
                  : "No plan yet"}
          </p>
          {subscription?.canRenew && !isPastDue && (
            <Button variant="outline" size="sm" className="mt-2 max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:mt-0" onClick={onRenewClick}>
              Renew now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
