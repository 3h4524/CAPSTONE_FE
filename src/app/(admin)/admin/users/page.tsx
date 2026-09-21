"use client";

import React, { useState } from "react";
import {
  Activity,
  Calendar,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Search,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import {
  getAdminDashboardMetrics,
  getAdminPlans,
  getAdminUsers,
  suspendAdminUser,
  unlockAdminUser} from "@/api/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { BanUserModal } from "@/components/admin/users/ban-user-modal";
import { EditUserModal } from "@/components/admin/users/edit-user-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/helpers/toast";
import type { AdminUserDto, GetUsersRequest } from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [request, setRequest] = useState<GetUsersRequest>({
    pageIndex: 1,
    pageSize: 10,
    searchTerm: "",
    role: "All",
    plan: "All",
    status: "All",
    sortBy: "LatestJoined",
    sortDesc: true,
  });

  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<AdminUserDto | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ["adminUsers", request],
    queryFn: () => getAdminUsers(request),
  });

  const { data: metrics } = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: () => getAdminDashboardMetrics("month"),
  });

  const { data: plansData } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: getAdminPlans,
  });

  const suspendMutation = useMutation({
    mutationFn: (params: { id: string, durationDays: number | null, reason: string }) => suspendAdminUser(params),
    onSuccess: () => {
      showToast("success", "Account suspended successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setIsBanModalOpen(false);
    },
    onError: () => showToast("error", "Failed to suspend account"),
  });

  const unlockMutation = useMutation({
    mutationFn: unlockAdminUser,
    onSuccess: () => {
      showToast("success", "Account unlocked successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: () => showToast("error", "Failed to unlock account"),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequest((prev) => ({ ...prev, searchTerm: e.target.value, pageIndex: 1 }));
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast("success", "User ID copied to clipboard");
  };

  const handlePageChange = (newIndex: number) => {
    setRequest((prev) => ({ ...prev, pageIndex: newIndex }));
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      const exportRequest = { ...request, pageIndex: 1, pageSize: 999999 };
      const data = await getAdminUsers(exportRequest);

      if (!data || data.items.length === 0) {
        showToast("error", "No data found to export.");
        return;
      }

      const headers = ["ID", "Name", "Email", "Role", "Plan", "Status", "Joined At", "Active Jobs", "API Cost ($)"];
      const csvContent = data.items.map(u => {
        const name = `"${u.fullName.replace(/"/g, '""')}"`;
        const email = `"${u.email}"`;
        const roles = `"${u.roles.join(", ")}"`;
        const date = new Date(u.createdAt).toLocaleDateString();
        const cost = u.monthlyApiCost.toFixed(2);

        return [u.id, name, email, roles, u.plan, u.accountStatus, date, u.totalJobs, cost].join(",");
      });

      const csvData = [headers.join(","), ...csvContent].join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `apcs_users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast("success", `Exported ${data.items.length} users successfully!`);
    } catch {
      showToast("error", "An error occurred while exporting data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewUser = (user: AdminUserDto) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user: AdminUserDto) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSuspendUser = (user: AdminUserDto) => {
    setUserToBan(user);
    setIsBanModalOpen(true);
  };

  return (
    <AdminShell>
      <>
        <div className="flex h-full flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center space-x-2 text-sm text-slate-500">
                <span>Admin</span>
                <span>/</span>
                <span className="font-medium text-slate-900">Users</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and manage registered user accounts.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportCSV}
                disabled={(!result || result.items.length === 0) || isExporting}
              >
                {isExporting ? (
                  <Spinner aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">{metrics?.totalUsers || 0}</p>
                <p className="mt-1 text-xs text-slate-400">+12% from last month</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Active Paid Users</p>
                <CreditCard className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">{metrics?.activePaidUsers || 0}</p>
                <p className="mt-1 text-xs text-slate-400">85% active rate</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                <DollarSign className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  ${(metrics?.totalRevenue || 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-400">+5.2% from last month</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Active Jobs</p>
                <Activity className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">{metrics?.activeBatchJobs || 0}</p>
                <p className="mt-1 text-xs text-slate-400">Normal workload</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    className="w-full pl-9"
                    value={request.searchTerm}
                    onChange={handleSearch}
                  />
                </div>

                <Select
                  value={request.role}
                  onValueChange={(val) => setRequest((prev) => ({ ...prev, role: val, pageIndex: 1 }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Seller">Seller</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={request.plan}
                  onValueChange={(val) => setRequest((prev) => ({ ...prev, plan: val, pageIndex: 1 }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All plans</SelectItem>
                    {plansData?.map((planName) => (
                      <SelectItem key={planName} value={planName}>{planName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={request.status}
                  onValueChange={(val) => setRequest((prev) => ({ ...prev, status: val, pageIndex: 1 }))}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            <div className="mt-2">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  Loading users...
                </div>
              ) : isError ? (
                <div className="flex h-64 items-center justify-center text-sm text-rose-500">
                  Failed to load user list. Please try again or contact support.
                </div>
              ) : result && result.items.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No users match the search or filter criteria.
                </div>
              ) : result ? (
                <div className="flex flex-col gap-4">
                  <AdminUsersTable
                    users={result.items}
                    onView={handleViewUser}
                    onEdit={handleEditUser}
                    onSuspend={handleSuspendUser}
                    onUnlock={(user) => unlockMutation.mutate(user.id)}
                    onCopyId={handleCopyId}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {result.items.length} of {result.totalCount} users
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(request.pageIndex || 1) <= 1}
                        onClick={() => handlePageChange((request.pageIndex || 1) - 1)}
                      >
                        Previous
                      </Button>
                      <div className="px-2 text-sm text-slate-600">
                        Page {result.pageNumber} of {result.totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(request.pageIndex || 1) >= result.totalPages}
                        onClick={() => handlePageChange((request.pageIndex || 1) + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-[480px] overflow-hidden rounded-[24px] border border-slate-200/50 bg-slate-50 p-0 shadow-2xl">
            <div className="relative p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-24 items-center justify-center rounded-full border border-slate-100 bg-white p-1.5 shadow-sm">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 text-3xl font-bold text-white">
                    {selectedUser?.fullName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <DialogTitle className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                  {selectedUser?.fullName}
                </DialogTitle>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  {selectedUser?.email}
                </p>
                <div className="mt-4">
                  {selectedUser?.accountStatus.toLowerCase() === "active" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active Account
                    </span>
                  )}
                  {selectedUser?.accountStatus.toLowerCase() === "suspended" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-rose-700 ring-1 ring-rose-600/20 ring-inset">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      Suspended Account
                    </span>
                  )}
                </div>
              </div>

              {selectedUser && (
                <div className="mt-8 flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-2 flex items-center gap-2">
                          <Shield className="size-4 text-slate-400" />
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">User ID</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="mr-2 truncate font-mono text-sm font-semibold text-slate-700" title={selectedUser.id}>{selectedUser.id.substring(0, 8)}...</span>
                          <button onClick={() => handleCopyId(selectedUser.id)} className="text-slate-400 transition-colors hover:text-slate-900">
                            <Copy className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-2 flex items-center gap-2">
                          <Users className="size-4 text-slate-400" />
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Role</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{selectedUser.roles.join(", ") || "None"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-2 flex items-center gap-2">
                          <Zap className="size-4 text-amber-500" />
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Plan</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{selectedUser.plan}</span>
                      </div>
                      <div className="rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <div className="mb-2 flex items-center gap-2">
                          <Calendar className="size-4 text-slate-400" />
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Joined Date</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-100/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <Activity className="size-4 text-emerald-500" />
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Active Jobs</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900">{selectedUser.totalJobs}</span>
                      </div>
                      <div className="h-10 w-px bg-slate-100"></div>
                      <div className="text-right">
                        <div className="mb-1 flex items-center justify-end gap-2">
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">API Cost</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900">${selectedUser.monthlyApiCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-3">
                    <Button variant="outline" className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900" onClick={() => setIsViewModalOpen(false)}>
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => {
                        setIsViewModalOpen(false);
                        if (selectedUser) handleEditUser(selectedUser);
                      }}
                    >
                      Edit User
                    </Button>
                    {selectedUser.accountStatus.toLowerCase() !== "suspended" && (
                      <Button
                        variant="outline"
                        className="h-11 flex-1 rounded-xl border-slate-200 bg-white font-semibold text-rose-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => {
                          setIsViewModalOpen(false);
                          handleSuspendUser(selectedUser);
                        }}
                      >
                        Suspend User
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <EditUserModal
          user={selectedUser}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
        <BanUserModal
          user={userToBan}
          isOpen={isBanModalOpen}
          onClose={() => setIsBanModalOpen(false)}
          onConfirm={(durationDays, reason) => userToBan && suspendMutation.mutate({ id: userToBan.id, durationDays, reason })}
          isLoading={suspendMutation.isPending}
        />
      </>
    </AdminShell>
  );
}
