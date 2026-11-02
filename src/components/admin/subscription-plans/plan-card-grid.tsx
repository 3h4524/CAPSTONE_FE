"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Award, Check, ChevronDown, ChevronsUpDown, Copy, GripVertical, Hourglass, Layers, LayoutGrid, type LucideIcon, Pencil, Plus, Star, Table2, Tag, Trash2, Users, X } from "lucide-react";

import { addableFeatures,AddFeatureDialog } from "@/components/admin/subscription-plans/add-feature-dialog";
import { DuplicatePlanDialog } from "@/components/admin/subscription-plans/duplicate-plan-dialog";
import { FreeTrialCard } from "@/components/admin/subscription-plans/free-trial-card";
import { LimitEditDialog, type LimitTarget } from "@/components/admin/subscription-plans/limit-edit-dialog";
import { PlanCarousel } from "@/components/admin/subscription-plans/plan-carousel";
import { PlanCompareTable } from "@/components/admin/subscription-plans/plan-compare-table";
import { type FeatureTarget, RemoveFeatureDialog } from "@/components/admin/subscription-plans/remove-feature-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { catalogFeatures, isSafetyCap, type PlanFeatureDefinition } from "@/helpers/plan-features";
import { useChangePlanFeatures } from "@/hooks/mutations/use-change-plan-features";
import { useReorderPlans } from "@/hooks/mutations/use-plan-tools";
import { useSetRecommendedPlan } from "@/hooks/mutations/use-set-recommended-plan";
import { useAdminFeatures } from "@/hooks/queries/use-admin-features";
import { usePlanSettings } from "@/hooks/queries/use-plan-settings";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import type { AdminFeature } from "@/types/feature-catalog";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

type PlanCardGridProps = {
  plans: AdminSubscriptionPlan[];
  isLoading: boolean;
  onEdit: (plan: AdminSubscriptionPlan) => void;
  onDelete: (plan: AdminSubscriptionPlan) => void;
};

const formatLimit = (value: number) => (value < 0 ? "No limit" : value.toLocaleString());

// The on/off features the plan has, in catalog order. What it does not have is added from the dialog.
const includedFeatures = (plan: AdminSubscriptionPlan, features: PlanFeatureDefinition[]) =>
  features.filter(
    (definition) =>
      definition.kind === "flag" &&
      plan.features.some((row) => row.code === definition.code && row.isEnabled)
  );

// The on/off features the plan could still take, in catalog order: offered in the catalog and not on it.
const missingFeatures = (plan: AdminSubscriptionPlan, features: PlanFeatureDefinition[], catalog: AdminFeature[]) => {
  const addable = new Set(addableFeatures(plan, catalog).map((feature) => feature.code));
  return features.filter((definition) => addable.has(definition.code));
};

// Every limit with the plan's value: null is no limit (also when the plan has no row), 0 is off.
const planLimits = (plan: AdminSubscriptionPlan, features: PlanFeatureDefinition[]) =>
  features
    .filter((definition) => definition.kind === "limit")
    .map((definition) => {
      const row = plan.features.find((feature) => feature.code === definition.code);
      return { ...definition, value: row ? (row.isEnabled ? row.limitValue : 0) : null };
    });

export function PlanCardGrid({ plans, isLoading, onEdit, onDelete }: PlanCardGridProps) {
  // Labels and order as the Admin set them in the feature catalog.
  const { data: catalog = [] } = useAdminFeatures();
  const features = catalogFeatures(catalog);
  const [addingTo, setAddingTo] = useState<AdminSubscriptionPlan | null>(null);
  const [removing, setRemoving] = useState<FeatureTarget | null>(null);
  const [editingLimit, setEditingLimit] = useState<LimitTarget | null>(null);
  const quickAdd = useChangePlanFeatures();
  const [layout, setLayout] = useState<"cards" | "compare">("cards");
  // Opens or closes the "not in plan" and limits sections on every card at once.
  const [showDetails, setShowDetails] = useState(false);
  const [duplicating, setDuplicating] = useState<AdminSubscriptionPlan | null>(null);
  // The order shown while dragging; saved when the card is dropped.
  const [order, setOrder] = useState<string[]>([]);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const reorder = useReorderPlans();
  // The plan Sellers see marked Recommended, as an Admin chose it.
  const recommendedTier = usePlanSettings().data?.recommendedPlanTier ?? null;
  const setRecommended = useSetRecommendedPlan();
  const planIds = plans.map((plan) => plan.id).join(",");

  useEffect(() => {
    setOrder(planIds ? planIds.split(",") : []);
  }, [planIds]);

  const ordered = order.length === plans.length
    ? order.map((id) => plans.find((plan) => plan.id === id)).filter((plan): plan is AdminSubscriptionPlan => plan !== undefined)
    : plans;

  const move = (id: string, to: number) =>
    setOrder((current) => {
      const next = current.filter((item) => item !== id);
      next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
      return next;
    });
  const saveOrder = (next: string[]) => {
    if (next.join(",") !== planIds) reorder.mutate(next);
  };
  const moveBy = (id: string, step: number) => {
    const next = order.filter((item) => item !== id);
    next.splice(Math.max(0, Math.min(order.indexOf(id) + step, next.length)), 0, id);
    setOrder(next);
    saveOrder(next);
  };

  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="h-80 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
          />
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <Card className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Layers className="mx-auto size-6 text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-700">No subscription plans yet</p>
        <p className="text-xs text-slate-400">Create the first one with “Create new plan”.</p>
      </Card>
    );
  }

  const sellingPlans = plans.filter((plan) => plan.isActive);
  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.activeSubscriberCount, 0);
  const totalTrials = plans.reduce((sum, plan) => sum + (plan.trialSubscriberCount ?? 0), 0);
  // The plan most paying Sellers are on, with its share of them; none until someone pays.
  const topPlan = [...plans].sort((a, b) => b.activeSubscriberCount - a.activeSubscriberCount)[0];
  const topShare = totalSubscribers > 0 ? Math.round((topPlan.activeSubscriberCount / totalSubscribers) * 100) : 0;

  const units = new Map(catalog.map((feature) => [feature.code, feature.unit]));
  const hasDescriptions = plans.some((plan) => Boolean(plan.description));

  return (
    <div className="mt-6 space-y-5">
      {/* The figures across all plans as one plain strip, read left to right. */}
      <Card className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-0 shadow-xs lg:grid-cols-4">
        <SummaryTile
          icon={Tag}
          label="Plans on sale"
          value={`${sellingPlans.length}`}
          suffix={`of ${plans.length}`}
          hint={sellingPlans.length === plans.length ? "All plans are on sale" : `${plans.length - sellingPlans.length} taken off sale`}
        />
        <SummaryTile icon={Users} label="Paying subscribers" value={totalSubscribers.toLocaleString()} hint="Across every plan" />
        <SummaryTile icon={Hourglass} label="On free trial" value={totalTrials.toLocaleString()} hint="Not counted until they pay" />
        <SummaryTile
          icon={Award}
          label="Most popular"
          value={totalSubscribers > 0 ? topPlan.name : "—"}
          hint={totalSubscribers > 0 ? `${topShare}% of paying subscribers` : "No paying subscribers yet"}
          share={totalSubscribers > 0 ? topShare : undefined}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          {plans.length} plan{plans.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          {layout === "cards" && (
            <button
              type="button"
              aria-pressed={showDetails}
              onClick={() => setShowDetails((value) => !value)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              <ChevronsUpDown className="size-3" />
              {showDetails ? "Hide all details" : "Show all details"}
            </button>
          )}
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Plans layout">
          {(["cards", "compare"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={layout === item}
              onClick={() => setLayout(item)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                layout === item ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {item === "cards" ? <LayoutGrid className="size-3" /> : <Table2 className="size-3" />}
              {item === "cards" ? "Cards" : "Compare"}
            </button>
          ))}
        </div>
        </div>
      </div>

      {layout === "compare" ? (
        <PlanCompareTable
          plans={plans}
          features={features}
          catalog={catalog}
          isAdding={quickAdd.isPending}
          onAdd={(plan, code) => quickAdd.mutate({ type: "add", planId: plan.id, features: [{ code }] })}
          onRemove={(plan, code, label) => setRemoving({ plan, code, label })}
          onEditLimit={(plan, feature, current) =>
            setEditingLimit({ plan, code: feature.code, label: feature.label, current, unit: units.get(feature.code) ?? null })
          }
        />
      ) : (
      /* Up to four plans fill one row; more slide sideways with arrows instead of wrapping. */
      <PlanCarousel
        items={ordered.map((plan, index) => ({
          key: plan.id,
          node: (
          <div
            draggable={armed === plan.id}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              setDragging(plan.id);
            }}
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              if (dragging !== plan.id) move(dragging, index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              saveOrder(order);
            }}
            onDragEnd={() => {
              setDragging(null);
              setArmed(null);
            }}
            className={cn("flex w-full transition-opacity *:flex-1", dragging === plan.id && "opacity-50")}
          >
          <PlanCard
            plan={plan}
            position={{ index, count: ordered.length }}
            hasDescriptions={hasDescriptions}
            onArm={(isArmed) => setArmed(isArmed ? plan.id : null)}
            onMove={(step) => moveBy(plan.id, step)}
            onDuplicate={() => setDuplicating(plan)}
            basePlan={plans
              .filter((other) => other.monthlyPriceUsd < plan.monthlyPriceUsd)
              .sort((a, b) => b.monthlyPriceUsd - a.monthlyPriceUsd)[0]}
            isRecommended={plan.tier === recommendedTier}
            isSavingRecommended={setRecommended.isPending}
            onToggleRecommended={() => setRecommended.mutate(plan.tier === recommendedTier ? null : plan.tier)}
            showDetails={showDetails}
            features={features}
            units={units}
            missing={missingFeatures(plan, features, catalog)}
            isAdding={quickAdd.isPending}
            onEdit={onEdit}
            onDelete={onDelete}
            onAdd={() => setAddingTo(plan)}
            onQuickAdd={(code) => quickAdd.mutate({ type: "add", planId: plan.id, features: [{ code }] })}
            onRemove={(code, label) => setRemoving({ plan, code, label })}
            onEditLimit={(target) => setEditingLimit({ plan, ...target })}
          />
          </div>
          ),
        }))}
      />
      )}

      <FreeTrialCard />

      <DuplicatePlanDialog plan={duplicating} onClose={() => setDuplicating(null)} />

      <AddFeatureDialog plan={addingTo} catalog={catalog} onClose={() => setAddingTo(null)} />
      <RemoveFeatureDialog target={removing} onClose={() => setRemoving(null)} />
      <LimitEditDialog target={editingLimit} onClose={() => setEditingLimit(null)} />
    </div>
  );
}

function PlanCard({
  plan,
  position,
  hasDescriptions,
  onArm,
  onMove,
  onDuplicate,
  isRecommended,
  basePlan,
  isSavingRecommended,
  onToggleRecommended,
  showDetails,
  features: definitions,
  units,
  missing,
  isAdding,
  onEdit,
  onDelete,
  onAdd,
  onQuickAdd,
  onRemove,
  onEditLimit,
}: {
  plan: AdminSubscriptionPlan;
  position: { index: number; count: number };
  // False when no plan has a description, so no card keeps room for one.
  hasDescriptions: boolean;
  // Pressing the handle lets the card be dragged; the arrow keys move it one place.
  onArm: (isArmed: boolean) => void;
  onMove: (step: number) => void;
  onDuplicate: () => void;
  // The plan Sellers see marked Recommended is dark here as on their billing page.
  isRecommended: boolean;
  // The next cheaper plan, whose features this card takes as given.
  basePlan?: AdminSubscriptionPlan;
  isSavingRecommended: boolean;
  onToggleRecommended: () => void;
  showDetails: boolean;
  features: PlanFeatureDefinition[];
  units: Map<string, string | null>;
  missing: PlanFeatureDefinition[];
  isAdding: boolean;
  onEdit: (plan: AdminSubscriptionPlan) => void;
  onDelete: (plan: AdminSubscriptionPlan) => void;
  onAdd: () => void;
  onQuickAdd: (code: string) => void;
  onRemove: (code: string, label: string) => void;
  onEditLimit: (target: Omit<LimitTarget, "plan">) => void;
}) {
  const included = includedFeatures(plan, definitions);
  // On a higher plan, the features the cheaper plan already has are said in one line, as Sellers see
  // it; the full list (to remove one) is a click away.
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const baseCodes = basePlan ? new Set(includedFeatures(basePlan, definitions).map((feature) => feature.code)) : null;
  const inherited = baseCodes ? included.filter((feature) => baseCodes.has(feature.code)).length : 0;
  const listed = baseCodes && !showAllFeatures ? included.filter((feature) => !baseCodes.has(feature.code)) : included;
  const limits = planLimits(plan, definitions);
  const isDark = isRecommended;
  const iconButton = isDark ? "text-slate-300 hover:bg-white/10 hover:text-white" : undefined;
  // Each card opens its own sections; "Show all details" opens or closes them all.
  const [isMissingOpen, setIsMissingOpen] = useState(showDetails);
  const [isLimitsOpen, setIsLimitsOpen] = useState(showDetails);
  useEffect(() => {
    setIsMissingOpen(showDetails);
    setIsLimitsOpen(showDetails);
  }, [showDetails]);

  return (
    <Card
      className={cn(
        "group/card @container relative isolate flex flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        isDark
          ? "border-slate-800 bg-linear-to-b from-slate-800 via-slate-900 to-slate-950 text-white shadow-xl ring-1 shadow-slate-900/20 ring-white/10 ring-inset hover:shadow-2xl"
          : plan.isActive
            ? "border-slate-200 bg-linear-to-b from-sky-50/80 via-white to-white"
            : "border-dashed border-slate-300 bg-slate-50/60"
      )}
    >
      {isDark && (
        // A soft light from the top edge, as on a glass panel.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_70%)]"
        />
      )}
      {/* Rivets in the corners, a quiet frame for the card. */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((spot) => (
        <span
          key={spot}
          aria-hidden="true"
          className={cn("absolute size-1.5 rounded-full", spot, isDark ? "bg-white/20" : "bg-slate-200")}
        />
      ))}

      <div className="flex items-start justify-between gap-3 p-6 pb-4">
        <div className="flex min-w-0 items-start gap-1.5">
          {position.count > 1 && (
            <button
              type="button"
              aria-label={`Move ${plan.name}: drag, or use the arrow keys`}
              title="Drag to reorder"
              onPointerDown={() => onArm(true)}
              onPointerUp={() => onArm(false)}
              onKeyDown={(event) => {
                if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && position.index > 0) {
                  event.preventDefault();
                  onMove(-1);
                }
                if ((event.key === "ArrowRight" || event.key === "ArrowDown") && position.index < position.count - 1) {
                  event.preventDefault();
                  onMove(1);
                }
              }}
              className={cn(
                "mt-0.5 -ml-1.5 cursor-grab rounded p-0.5 active:cursor-grabbing",
                isDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-300 hover:bg-slate-100 hover:text-slate-600"
              )}
            >
              <GripVertical className="size-4" />
            </button>
          )}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={cn("truncate text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{plan.name}</h3>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              isDark ? "border-white/15 bg-white/10 text-slate-100" : "border-slate-200 bg-white text-slate-700"
            )}
          >
            <span className={cn("size-1.5 rounded-full", plan.isActive ? "bg-emerald-500" : "bg-slate-400")} />
            {plan.isActive ? "On sale" : "Not on sale"}
          </span>
          {/* Beside the sale status, the same size, so it adds no row and the cards stay level. */}
          {isDark && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/40 bg-orange-400/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-orange-200 uppercase">
              <span className="size-1.5 rounded-full bg-orange-300" />
              Recommended
            </span>
          )}
        </div>
        </div>
        {/* Plan actions show on hover or keyboard focus, so a row of cards stays calm. */}
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            className={iconButton}
            aria-label={isRecommended ? `Stop recommending ${plan.name}` : `Recommend ${plan.name}`}
            aria-pressed={isRecommended}
            title={
              isRecommended
                ? "Stop recommending this plan"
                : plan.isActive
                  ? "Show this plan as Recommended to Sellers"
                  : "Put this plan on sale to recommend it"
            }
            disabled={isSavingRecommended || (!plan.isActive && !isRecommended)}
            onClick={onToggleRecommended}
          >
            <Star className={cn("size-3.5", isRecommended && "fill-orange-400 text-orange-400")} />
          </Button>
          <Button variant="ghost" size="icon-sm" className={iconButton} aria-label={`Duplicate ${plan.name}`} title="Duplicate plan" onClick={onDuplicate}>
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={iconButton}
            aria-label={`Edit ${plan.name}`}
            onClick={() => onEdit(plan)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={iconButton}
            aria-label={`Delete ${plan.name}`}
            title={
              plan.canDelete
                ? "Delete plan"
                : "This plan has subscribers. Take it off sale instead."
            }
            onClick={() => onDelete(plan)}
          >
            <Trash2
              className={cn("size-3.5", plan.canDelete ? "text-rose-500" : isDark ? "text-slate-400" : "text-slate-300")}
            />
          </Button>
        </div>
      </div>

      <div className="px-6">
        <p className="flex items-baseline gap-1.5">
          <span className={cn("text-4xl font-extrabold tracking-tight tabular-nums", isDark ? "text-white" : "text-slate-900")}>
            {formatVnd(plan.monthlyPriceVnd)}
          </span>
          <span className={cn("text-sm", isDark ? "text-slate-300" : "text-slate-500")}>/month</span>
        </p>
        <p className={cn("mt-1 min-h-4 text-xs", isDark ? "text-slate-300" : "text-slate-500")}>
          {plan.annualPriceVnd !== null ? `or ${formatVnd(plan.annualPriceVnd)} a year` : ""}
        </p>
        {/* Two lines tall when any plan has a description, so the figures below line up across cards. */}
        {hasDescriptions && (
          <p className={cn("mt-3 line-clamp-2 min-h-10 text-xs leading-5", isDark ? "text-slate-300" : "text-slate-500")}>
            {plan.description}
          </p>
        )}
      </div>

      <div
        className={cn(
          "mx-6 mt-4 grid grid-cols-3 divide-x rounded-xl py-3 text-center",
          isDark ? "divide-white/10 bg-white/5 ring-1 ring-white/10" : "divide-slate-100 bg-white shadow-xs ring-1 ring-slate-200"
        )}
      >
        <Stat
          label="Subscribers"
          value={plan.activeSubscriberCount.toLocaleString()}
          icon
          isDark={isDark}
          extra={<TrialBadge count={plan.trialSubscriberCount ?? 0} planName={plan.name} isDark={isDark} />}
        />
        <Stat label="Per run" value={formatLimit(plan.maxBatchSize)} isDark={isDark} />
        <Stat label="Jobs at once" value={formatLimit(plan.maxConcurrentJobs)} isDark={isDark} />
      </div>

      <div className="flex-1 px-6 pt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase", isDark ? "text-slate-300" : "text-slate-600")}>
            Features
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[10px] tabular-nums",
                isDark ? "bg-orange-500/20 text-orange-200" : "bg-emerald-50 text-emerald-700"
              )}
            >
              {included.length}
            </span>
          </p>
          {basePlan && inherited > 0 && (
            <button
              type="button"
              onClick={() => setShowAllFeatures((value) => !value)}
              className={cn("text-[11px] font-semibold", isDark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-900")}
            >
              {showAllFeatures ? "Show only what's new" : `Show all ${included.length}`}
            </button>
          )}
        </div>
        {basePlan && !showAllFeatures && inherited > 0 && (
          <p className={cn("mb-1.5 text-xs font-semibold", isDark ? "text-white" : "text-slate-800")}>
            Everything in {basePlan.name}
            {listed.length > 0 ? ", plus:" : "."}
          </p>
        )}
        {included.length === 0 ? (
          <p className="text-xs text-slate-400">No features yet. Add the ones this plan sells.</p>
        ) : (
          // A wide card lists the features in two columns.
          <ul className="grid gap-x-6 gap-y-1 @lg:grid-cols-2">
            {listed.map((feature) => (
              <li
                key={feature.code}
                className={cn("group flex items-center gap-2 rounded-md py-0.5 text-[13px]", isDark ? "text-slate-100" : "text-slate-700")}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full",
                    isDark ? "bg-orange-500/20 text-orange-300" : "bg-emerald-50 text-emerald-600"
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate">{feature.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${feature.label} from ${plan.name}`}
                  title="Remove from this plan"
                  onClick={() => onRemove(feature.code, feature.label)}
                  className={cn(
                    "rounded p-0.5 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
                    isDark ? "text-slate-400 hover:bg-rose-500/20 hover:text-rose-300" : "text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                  )}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* What the plan could still take and its limits, folded away until asked for. */}
      <div className={cn("mt-5 divide-y border-t px-6 pb-4", isDark ? "divide-white/10 border-white/10" : "divide-slate-100 border-slate-100")}>
        {/* A plan with every feature keeps the row, so the footers of side-by-side cards line up. */}
        {missing.length === 0 && (
          <p className={cn("py-2.5 text-[11px] font-semibold tracking-wide uppercase", isDark ? "text-slate-400" : "text-slate-400")}>
            Every feature included
          </p>
        )}
        {missing.length > 0 && (
          <div className="py-2">
            <div className="flex items-center justify-between gap-2">
              <SectionToggle
                label={`Not in ${plan.name} · ${missing.length}`}
                isOpen={isMissingOpen}
                isDark={isDark}
                onToggle={() => setIsMissingOpen((value) => !value)}
              />
              <button
                type="button"
                onClick={onAdd}
                className={cn(
                  "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                  isDark ? "text-slate-200 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Plus className="size-3" /> Add several
              </button>
            </div>
            {isMissingOpen && (
            <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 @lg:grid-cols-2">
              {missing.map((feature) => (
                <li
                  key={feature.code}
                  className={cn("group flex items-center gap-2 py-0.5 text-xs", isDark ? "text-slate-400" : "text-slate-400")}
                >
                  <span className="min-w-0 flex-1 truncate">{feature.label}</span>
                  <button
                    type="button"
                    aria-label={`Add ${feature.label} to ${plan.name}`}
                    title="Add to this plan"
                    disabled={isAdding}
                    onClick={() => onQuickAdd(feature.code)}
                    className={cn(
                      "rounded p-0.5 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100",
                      isDark ? "text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-300" : "text-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
                    )}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            )}
          </div>
        )}

        <div className="py-2">
        <SectionToggle
          label={`Limits · ${limits.length}`}
          isOpen={isLimitsOpen}
          isDark={isDark}
          onToggle={() => setIsLimitsOpen((value) => !value)}
        />
        {isLimitsOpen && (
        <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 @lg:grid-cols-2">
          {limits.map((limit) => (
            <li key={limit.code} className={cn("group flex items-center gap-2 text-[11px]", isDark ? "text-slate-300" : "text-slate-500")}>
              <span className="min-w-0 flex-1 truncate">
                {limit.label}
                {isSafetyCap(limit.code) && <span className={isDark ? "text-slate-400" : "text-slate-400"}> · hidden from Sellers</span>}
              </span>
              <span className={cn("font-semibold tabular-nums", isDark ? "text-slate-100" : "text-slate-700")}>
                {limit.value === null ? "No limit" : `${limit.value.toLocaleString()}${units.get(limit.code) ? ` ${units.get(limit.code)}` : ""}`}
              </span>
              <button
                type="button"
                aria-label={`Change ${limit.label} on ${plan.name}`}
                onClick={() => onEditLimit({ code: limit.code, label: limit.label, current: limit.value, unit: units.get(limit.code) ?? null })}
                className={cn(
                  "rounded p-0.5",
                  isDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-300 hover:bg-slate-100 hover:text-slate-700"
                )}
              >
                <Pencil className="size-3" />
              </button>
            </li>
          ))}
        </ul>
        )}
        </div>
      </div>
    </Card>
  );
}

// The header of a folding section on a plan card.
function SectionToggle({
  label,
  isOpen,
  isDark,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className={cn(
        "-ml-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        isDark ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-900"
      )}
    >
      <ChevronDown className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")} />
      {label}
    </button>
  );
}

// One figure across all plans, a column of the strip above the cards.
function SummaryTile({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  share,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  hint: string;
  share?: number;
}) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
        <Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5 truncate">
        <span className="text-2xl leading-tight font-semibold tracking-tight text-slate-900 tabular-nums">{value}</span>
        {suffix && <span className="text-sm text-slate-400 tabular-nums">{suffix}</span>}
      </p>
      {share !== undefined && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-slate-700" style={{ width: `${share}%` }} />
        </div>
      )}
      <p className={cn("truncate text-[11px] text-slate-400", share !== undefined ? "mt-1.5" : "mt-0.5")}>{hint}</p>
    </div>
  );
}

// Trials sit beside the subscriber count, never added to it: they have not paid yet.
function TrialBadge({ count, planName, isDark = false }: { count: number; planName: string; isDark?: boolean }) {
  if (count <= 0) return null;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "cursor-help rounded-full px-1.5 py-px text-[10px] font-semibold",
              isDark ? "bg-teal-400/20 text-teal-200" : "bg-[#2a9d8f]/12 text-[#21796e]"
            )}
          >
            +{count.toLocaleString()} trial
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-xs">
          {count.toLocaleString()} Sellers on a free {planName} trial. Not counted as subscribers
          until they pay.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  icon = false,
  isDark = false,
  extra,
}: {
  label: string;
  value: string;
  icon?: boolean;
  isDark?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="min-w-0 px-2">
      <p
        className={cn(
          "flex min-h-6 flex-wrap items-center justify-center gap-1 text-lg leading-tight font-bold tabular-nums",
          isDark ? "text-white" : "text-slate-900"
        )}
      >
        {icon && <Users className="size-3.5 text-slate-400" />}
        {value}
        {extra}
      </p>
      <p className={cn("text-[10px] font-semibold tracking-wide uppercase", isDark ? "text-slate-300" : "text-slate-400")}>{label}</p>
    </div>
  );
}
