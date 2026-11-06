import type { SellerOpportunity } from "@/api/market-opportunities";

/** One niche Market Radar ranks for the Seller: what it is, how well it fits, and why. */
export const OpportunityRow = ({ opportunity }: { opportunity: SellerOpportunity }) => (
  <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
    <span
      className="bg-primary/10 text-primary flex size-10 shrink-0 flex-col items-center justify-center rounded-lg leading-none"
      title="Fit score out of 100"
    >
      <span className="text-sm font-semibold tabular-nums">
        {Math.round(opportunity.finalScore)}
      </span>
      <span className="text-[9px] font-medium opacity-70">fit</span>
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{opportunity.title}</p>
      <p className="text-muted-foreground truncate text-xs">
        {[opportunity.niche, opportunity.category].filter(Boolean).join(" · ")}
      </p>
      {opportunity.fitExplanation && (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {opportunity.fitExplanation}
        </p>
      )}
    </div>
  </li>
);
