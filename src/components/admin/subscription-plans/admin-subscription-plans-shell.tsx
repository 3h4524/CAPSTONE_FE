"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DeletePlanDialog } from "@/components/admin/subscription-plans/delete-plan-dialog";
import { FeatureCatalogPanel } from "@/components/admin/subscription-plans/feature-catalog-panel";
import { PlanCardGrid } from "@/components/admin/subscription-plans/plan-card-grid";
import { PlanFormDialog } from "@/components/admin/subscription-plans/plan-form-dialog";
import { PlanHistoryPanel } from "@/components/admin/subscription-plans/plan-history-panel";
import { PlanInsightsPanel } from "@/components/admin/subscription-plans/plan-insights-panel";
import { Button } from "@/components/ui/button";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

type AdminSubscriptionPlansShellProps = {
  fullName: string;
  onLogout: () => void;
  plans: AdminSubscriptionPlan[];
  isLoading: boolean;
};

type View = "plans" | "features" | "history" | "insights";

const VIEW_LABEL: Record<View, string> = { plans: "Plans", features: "Features", history: "History", insights: "Plan Insights" };

const AdminSubscriptionPlansShell = ({ fullName, onLogout, plans, isLoading }: AdminSubscriptionPlansShellProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formPlan, setFormPlan] = useState<AdminSubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletePlan, setDeletePlan] = useState<AdminSubscriptionPlan | null>(null);
  // ?view=insights opens Plan Insights directly (linked from the Revenue page); &plan=<key> also
  // scrolls its AI review to that plan.
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(searchParams.get("view") === "insights" ? "insights" : "plans");

  const openCreateForm = () => {
    setView("plans");
    setFormPlan(null);
    setIsFormOpen(true);
  };

  const openEditForm = (plan: AdminSubscriptionPlan) => {
    setFormPlan(plan);
    setIsFormOpen(true);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-screen">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-screen overflow-y-auto">
            <AdminTopbar
              fullName={fullName}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
              pageTitle="Subscriptions"
            />
            <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    Subscription Plans
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Configure tiers, pricing and the features each plan includes, and see how Sellers use them.
                  </p>
                </div>
                {/* On every tab, so the header keeps its shape; a new plan is shown with the others. */}
                <Button size="sm" className="h-9 shrink-0 self-start rounded-lg px-4 text-xs sm:self-auto" onClick={openCreateForm}>
                  <Plus className="size-3.5" /> Create new plan
                </Button>
              </div>

              <div
                className="mt-5 flex gap-6 overflow-x-auto border-b border-slate-200"
                role="tablist"
                aria-label="Subscription plans view"
              >
                {(["plans", "features", "history", "insights"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={view === item}
                    onClick={() => setView(item)}
                    className={cn(
                      "-mb-px shrink-0 border-b-2 px-0.5 pb-2.5 text-sm font-semibold transition-colors",
                      view === item
                        ? "border-slate-900 text-slate-900"
                        : "border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-700"
                    )}
                  >
                    {VIEW_LABEL[item]}
                  </button>
                ))}
              </div>

              {view === "insights" ? (
                <PlanInsightsPanel focusPlan={searchParams.get("plan")} />
              ) : view === "history" ? (
                <PlanHistoryPanel />
              ) : view === "features" ? (
                <FeatureCatalogPanel />
              ) : (
                <PlanCardGrid plans={plans} isLoading={isLoading} onEdit={openEditForm} onDelete={setDeletePlan} />
              )}
            </main>
          </div>
        </div>
      </div>

      <PlanFormDialog
        open={isFormOpen}
        plan={formPlan}
        usdToVndRate={plans[0]?.usdToVndRate ?? null}
        plans={plans}
        onClose={() => setIsFormOpen(false)}
      />
      <DeletePlanDialog open={deletePlan !== null} plan={deletePlan} onClose={() => setDeletePlan(null)} />
    </div>
  );
};

export { AdminSubscriptionPlansShell };
