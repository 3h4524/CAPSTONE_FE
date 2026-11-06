import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
};

export function MetricCard({ label, value, note, icon }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <span className="bg-primary/8 text-primary rounded-lg p-2">{icon}</span>
        </div>
        <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </CardContent>
    </Card>
  );
}
