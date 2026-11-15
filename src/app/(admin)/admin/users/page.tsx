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
import { toast } from "sonner";

import {
  getAdminDashboardMetrics,
  getAdminPlans,
  getAdminUsers,
  suspendAdminUser,
  unlockAdminUser} from "@/api/admin";
import { USER_DIALOG_ON_PHONE } from "@/components/admin/users/admin-user-parts";
import { AdminUsersTable } from "@/components/admin/users/admin-users-table";
import { BanUserModal } from "@/components/admin/users/ban-user-modal";
import { EditUserModal } from "@/components/admin/users/edit-user-modal";
import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { PageHeader } from "@/components/commons/layout/page-header";
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
import { useAdminOperations } from "@/hooks/queries/use-admin-operations";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { AdminUserDto, GetUsersRequest } from "@/types/admin";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const DESKTOP_PAGE_SIZE = 10;
const PHONE_PAGE_SIZE = 5;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const isPhone = useIsPhone();

  const [request, setRequest] = useState<GetUsersRequest>({
    pageIndex: 1,
    pageSize: DESKTOP_PAGE_SIZE,
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

  const pageRequest = { ...request, pageSize: isPhone ? PHONE_PAGE_SIZE : DESKTOP_PAGE_SIZE };
  const { data: result, isLoading, isError } = useQuery({
    queryKey: ["adminUsers", pageRequest],
    queryFn: () => getAdminUsers(pageRequest),
  });

  const { data: metrics } = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: () => getAdminDashboardMetrics("year"),
  });

  const { data: operations } = useAdminOperations("year");
  const paidShare = metrics?.totalUsers ? Math.round((metrics.activePaidUsers / metrics.totalUsers) * 100) : 0;

  const { data: plansData } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: getAdminPlans,
  });

  const suspendMutation = useMutation({
    mutationFn: (params: { id: string, durationDays: number | null, reason: string }) => suspendAdminUser(params),
    onSuccess: () => {
      toast.success("Account suspended successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setIsBanModalOpen(false);
    },
    onError: () => toast.error("Failed to suspend account"),
  });

  const unlockMutation = useMutation({
    mutationFn: unlockAdminUser,
    onSuccess: () => {
      toast.success("Account unlocked successfully");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: () => toast.error("Failed to unlock account"),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequest((prev) => ({ ...prev, searchTerm: e.target.value, pageIndex: 1 }));
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("User ID copied to clipboard");
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
        toast.error("No data found to export.");
        return;
      }

      const headers = ["ID", "Name", "Email", "Role", "Plan", "Status", "Joined At", "Active Jobs", "Plan Price (VND)"];
      const csvContent = data.items.map(u => {
        const name = `"${u.fullName.replace(/"/g, '""')}"`;
        const email = `"${u.email}"`;
        const roles = `"${u.roles.join(", ")}"`;
        const date = new Date(u.createdAt).toLocaleDateString();
        const cost = Math.round(u.monthlyApiCost).toString();
        
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
      
      toast.success(`Exported ${data.items.length} users successfully!`);
    } catch {
      toast.error("An error occurred while exporting data.");
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
    <>
      <div className="flex h-full flex-col gap-6 p-0 max-md:gap-3">
        <PageHeader
          title={
            <>
              Users<span className="max-md:hidden"> Management</span>
            </>
          }
          description="Search, filter, and manage registered user accounts."
          actions={
            <Button
              variant="outline"
              size="page-action"
              className="gap-2"
              onClick={handleExportCSV}
              disabled={(!result || result.items.length === 0) || isExporting}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 max-md:grid-cols-2 max-md:gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-ink-200/80 bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm max-md:p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-ink-500 text-sm font-medium">Total Users</p>
              <Users className="text-ink-400 h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-ink-900 text-2xl font-bold">{metrics?.totalUsers || 0}</p>
              <p className="text-ink-400 mt-1 text-xs">
                {operations ? `${operations.activeSellers.toLocaleString()} active sellers this year` : "All registered accounts"}
              </p>
            </div>
          </div>
          <div className="border-ink-200/80 bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm max-md:p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-ink-500 text-sm font-medium">Active Paid Users</p>
              <CreditCard className="text-ink-400 h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-ink-900 text-2xl font-bold">{metrics?.activePaidUsers || 0}</p>
              <p className="text-ink-400 mt-1 text-xs">{paidShare}% of all users</p>
            </div>
          </div>
          {/* The Dashboard shows this and Active Jobs: a phone goes straight on to the users. */}
          <div className="border-ink-200/80 bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm max-md:hidden">
            <div className="flex items-center justify-between">
              <p className="text-ink-500 text-sm font-medium">Total Revenue</p>
              <DollarSign className="text-ink-400 h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-ink-900 text-2xl font-bold">
                {formatVnd(metrics?.totalRevenue || 0)}
              </p>
              <p className="text-ink-400 mt-1 text-xs">Collected this year</p>
            </div>
          </div>
          <div className="border-ink-200/80 bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm max-md:hidden">
            <div className="flex items-center justify-between">
              <p className="text-ink-500 text-sm font-medium">Active Jobs</p>
              <Activity className="text-ink-400 h-4 w-4" />
            </div>
            <div className="mt-2">
              <p className="text-ink-900 text-2xl font-bold">{metrics?.activeBatchJobs || 0}</p>
              <p className="text-ink-400 mt-1 text-xs">{(metrics?.totalBatchJobs ?? 0).toLocaleString()} jobs in total</p>
            </div>
          </div>
        </div>

        <div className="border-ink-200/80 bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-sm max-md:gap-3 max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none">
          {/* Top Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 max-[359px]:grid-cols-2 max-md:grid max-md:w-full max-md:grid-cols-3 max-md:gap-2">
              <div className="relative w-72 max-md:col-span-full max-md:w-full">
                <Search className="text-ink-400 absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  className="bg-card w-full pl-9"
                  value={request.searchTerm}
                  onChange={handleSearch}
                />
              </div>

              <Select
                value={request.role}
                onValueChange={(val) => setRequest((prev) => ({ ...prev, role: val, pageIndex: 1 }))}
              >
                <SelectTrigger className="bg-card w-[120px] max-md:w-full max-md:px-2 max-md:text-xs">
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
                <SelectTrigger className="bg-card w-[120px] max-md:w-full max-md:px-2 max-md:text-xs">
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
                <SelectTrigger className="bg-card w-[130px] max-[359px]:col-span-2 max-md:w-full max-md:px-2 max-md:text-xs">
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



          {/* Data Table */}
          <div className="mt-2">
            {isLoading ? (
              <div className="text-ink-500 flex h-64 items-center justify-center text-sm">
                Loading users...
              </div>
            ) : isError ? (
              <div className="flex h-64 items-center justify-center text-sm text-rose-500">
                Failed to load user list. Please try again or contact support.
              </div>
            ) : result && result.items.length === 0 ? (
              <div className="text-ink-500 flex h-64 items-center justify-center text-sm">
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
                <div className="flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-3">
                  <p className="text-ink-500 text-sm max-md:text-center max-md:text-xs">
                    Showing {result.items.length} of {result.totalCount} users
                  </p>
                  {isPhone ? (
                    <PhonePager
                      page={request.pageIndex || 1}
                      pageCount={result.totalPages}
                      onPageChange={handlePageChange}
                      label="User pages"
                    />
                  ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(request.pageIndex || 1) <= 1}
                      onClick={() => handlePageChange((request.pageIndex || 1) - 1)}
                    >
                      Previous
                    </Button>
                    <div className="text-ink-600 px-2 text-sm">
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
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className={cn("border-ink-200/50 bg-ink-50 max-w-[480px] overflow-hidden rounded-[24px] border p-0 shadow-2xl", USER_DIALOG_ON_PHONE)}>
          <div className="relative p-8 max-md:p-5">
            {/* Header: Clean & Centered */}
            <div className="flex flex-col items-center text-center">
              <div className="border-ink-100 bg-card flex size-24 items-center justify-center rounded-full border p-1.5 shadow-sm max-md:size-16">
                <div className="bg-ink-900 text-card flex h-full w-full items-center justify-center rounded-full text-3xl font-bold max-md:text-xl">
                  {selectedUser?.fullName.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <DialogTitle className="text-ink-900 mt-5 text-2xl font-bold tracking-tight wrap-anywhere max-md:mt-3 max-md:text-xl">
                {selectedUser?.fullName}
              </DialogTitle>
              <p className="text-ink-500 mt-1.5 text-sm font-medium wrap-anywhere">
                {selectedUser?.email}
              </p>
              <div className="mt-4">
                {selectedUser?.accountStatus.toLowerCase() === "active" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-500/15 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Active Account
                  </span>
                )}
                {selectedUser?.accountStatus.toLowerCase() === "suspended" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/60 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-rose-700 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-500/15 dark:text-rose-300">
                    <span className="size-1.5 rounded-full bg-rose-500" />
                    Suspended Account
                  </span>
                )}
              </div>
            </div>

            {selectedUser && (
              <div className="mt-8 flex flex-col gap-6">
                {/* Info Blocks */}
                <div className="flex flex-col gap-4">
                  {/* Row 1: ID & Role */}
                  <div className="grid grid-cols-2 gap-4 max-md:gap-2.5">
                    <div className="border-ink-100/60 bg-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md max-md:p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Shield className="text-ink-400 size-4" />
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">User ID</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-700 mr-2 truncate font-mono text-sm font-semibold" title={selectedUser.id}>{selectedUser.id.substring(0, 8)}...</span>
                        <button onClick={() => handleCopyId(selectedUser.id)} className="text-ink-400 hover:text-ink-900 transition-colors">
                          <Copy className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="border-ink-100/60 bg-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md max-md:p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="text-ink-400 size-4" />
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">Role</span>
                      </div>
                      <span className="text-ink-900 text-sm font-semibold">{selectedUser.roles.join(", ") || "None"}</span>
                    </div>
                  </div>

                  {/* Row 2: Plan & Date */}
                  <div className="grid grid-cols-2 gap-4 max-md:gap-2.5">
                    <div className="border-ink-100/60 bg-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md max-md:p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Zap className="size-4 text-amber-500" />
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">Plan</span>
                      </div>
                      <span className="text-ink-900 text-sm font-semibold">{selectedUser.plan}</span>
                    </div>
                    <div className="border-ink-100/60 bg-card rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md max-md:p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Calendar className="text-ink-400 size-4" />
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">Joined Date</span>
                      </div>
                      <span className="text-ink-900 text-sm font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Row 3: Jobs & Cost */}
                  <div className="border-ink-100/60 bg-card flex items-center justify-between rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md max-md:p-3">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <Activity className="size-4 text-emerald-500" />
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">Active Jobs</span>
                      </div>
                      <span className="text-ink-900 text-xl font-bold">{selectedUser.totalJobs}</span>
                    </div>
                    <div className="bg-ink-100 h-10 w-px"></div>
                    <div className="text-right">
                      <div className="mb-1 flex items-center justify-end gap-2">
                        <span className="text-ink-400 text-[10px] font-bold tracking-wider uppercase">Plan Price</span>
                      </div>
                      <span className="text-ink-900 text-xl font-bold">{formatVnd(selectedUser.monthlyApiCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-2 flex items-center justify-center gap-3 max-md:grid max-md:grid-cols-2 max-md:gap-2.5">
                  <Button variant="outline" className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 hover:text-ink-900 h-11 flex-1 rounded-xl font-semibold shadow-sm" onClick={() => setIsViewModalOpen(false)}>
                    Close
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 hover:text-ink-900 h-11 flex-1 rounded-xl font-semibold shadow-sm"
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
                      className="border-ink-200 bg-card h-11 flex-1 rounded-xl font-semibold text-rose-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 max-md:col-span-2 dark:text-rose-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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
  );
}
