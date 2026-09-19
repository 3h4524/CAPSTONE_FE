"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DeletePlanDialog } from "@/components/admin/subscription-plans/delete-plan-dialog";
import { PlanFormDialog } from "@/components/admin/subscription-plans/plan-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminSubscriptionPlan } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

type AdminSubscriptionPlansShellProps = {
  fullName: string;
  onLogout: () => void;
  plans: AdminSubscriptionPlan[];
  isLoading: boolean;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);

const formatLimit = (value: number) => (value === -1 ? "Unlimited" : value.toLocaleString());

const AdminSubscriptionPlansShell = ({ fullName, onLogout, plans, isLoading }: AdminSubscriptionPlansShellProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formPlan, setFormPlan] = useState<AdminSubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletePlan, setDeletePlan] = useState<AdminSubscriptionPlan | null>(null);

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
          activeItem="Subscriptions"
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
            <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    Subscription Plans
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Configure tiers, pricing, quotas, and feature access for every plan.
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <Button size="sm" className="h-8 rounded-md px-3 text-[10px]" onClick={openCreateForm}>
                    <Plus className="size-3" /> Create new plan
                  </Button>
                </div>
              </div>

              <Card className="mt-6">
                <CardContent>
                  {isLoading ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">Loading plans...</p>
                  ) : plans.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No subscription plans yet. Create the first one above.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="bg-muted/60 first:rounded-l-md">Plan</TableHead>
                          <TableHead className="bg-muted/60">Price</TableHead>
                          <TableHead className="bg-muted/60">Status</TableHead>
                          <TableHead className="bg-muted/60">Batch size</TableHead>
                          <TableHead className="bg-muted/60">Products / mo</TableHead>
                          <TableHead className="bg-muted/60">Subscribers</TableHead>
                          <TableHead className="bg-muted/60 text-right last:rounded-r-md">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div className="font-medium text-slate-800">{plan.name}</div>
                              <div className="text-muted-foreground text-xs">{plan.tier}</div>
                            </TableCell>
                            <TableCell>{formatCurrency(plan.monthlyPriceUsd)}/mo</TableCell>
                            <TableCell>
                              <Badge variant={plan.isActive ? "default" : "secondary"}>
                                {plan.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatLimit(plan.maxBatchSize)}</TableCell>
                            <TableCell>{formatLimit(plan.maxProductsPerMonth)}</TableCell>
                            <TableCell>{plan.activeSubscriberCount}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Edit ${plan.name}`}
                                  onClick={() => openEditForm(plan)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Delete ${plan.name}`}
                                  onClick={() => setDeletePlan(plan)}
                                >
                                  <Trash2 className={cn("size-3.5", plan.canDelete ? "text-rose-500" : "text-slate-400")} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </div>

      <PlanFormDialog open={isFormOpen} plan={formPlan} onClose={() => setIsFormOpen(false)} />
      <DeletePlanDialog open={deletePlan !== null} plan={deletePlan} onClose={() => setDeletePlan(null)} />
    </div>
  );
};

export { AdminSubscriptionPlansShell };
