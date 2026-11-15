import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { CheckoutStatus } from "@/types/subscription";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

type CheckoutStepReadyProps = {
  result: CheckoutStatus;
  onDone: () => void;
};

export const CheckoutStepReady = ({ result, onDone }: CheckoutStepReadyProps) => {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="text-primary size-12" />
      <div>
        <p className="text-lg font-semibold">{t("subscription.workspaceUpdated")}</p>
        <p className="text-muted-foreground text-sm">
          {result.planName} {t("subscription.nowActive")}{result.renewalDate ? t("subscription.renewsOn", { date: formatDate(result.renewalDate) }) : null}
        </p>
        <p className="text-muted-foreground text-xs">{t("subscription.invoiceLabel", { number: result.invoiceNumber })}</p>
      </div>
      <Button onClick={onDone}>{t("subscription.done")}</Button>
    </div>
  );
};
