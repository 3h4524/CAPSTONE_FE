import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CheckoutStatus } from "@/types/subscription";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

type CheckoutStepReadyProps = {
  result: CheckoutStatus;
  onDone: () => void;
};

export const CheckoutStepReady = ({ result, onDone }: CheckoutStepReadyProps) => {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="text-primary size-12" />
      <div>
        <p className="text-lg font-semibold">Workspace updated</p>
        <p className="text-muted-foreground text-sm">
          {result.planName} is now active.
          {result.renewalDate && ` Renews ${formatDate(result.renewalDate)}.`}
        </p>
        <p className="text-muted-foreground text-xs">Invoice {result.invoiceNumber}</p>
      </div>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
};
