"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DeletePlanDialog } from "@/components/admin/subscription-plans/delete-plan-dialog";
import { PlanCardGrid } from "@/components/admin/subscription-plans/plan-card-grid";
import { PlanFormDialog } from "@/components/admin/subscription-plans/plan-form-dialog";
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

type View = "plans" | "insights";

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
                <div className="flex items-center justify-end gap-2">
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Subscription plans view">
                    {(["plans", "insights"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={view === item}
                        onClick={() => setView(item)}
                        className={cn(
                          "rounded-md px-3 py-1 text-[11px] font-semibold transition-colors",
                          view === item ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {item === "plans" ? "Plans" : "Plan Insights"}
                      </button>
                    ))}
                  </div>
                  {view === "plans" && (
                    <Button size="sm" className="h-8 rounded-md px-3 text-[10px]" onClick={openCreateForm}>
                      <Plus className="size-3" /> Create new plan
                    </Button>
                  )}
                </div>
              </div>

              {view === "insights" ? (
                <PlanInsightsPanel focusPlan={searchParams.get("plan")} />
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
        onClose={() => setIsFormOpen(false)}
      />
      <DeletePlanDialog open={deletePlan !== null} plan={deletePlan} onClose={() => setDeletePlan(null)} />
    </div>
  );
};

export { AdminSubscriptionPlansShell };
