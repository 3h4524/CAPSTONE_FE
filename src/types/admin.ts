export type MonthlyRevenueDto = {
  month: string;
  subscriptions: number;
  usage: number;
};

export type SupportTicketDto = {
  userName: string;
  userEmail: string;
  issue: string;
  status: string;
  priority: string;
};

export type BatchJobDto = {
  name: string;
  itemCount: number;
  status: string;
  progressPercentage: string;
  userName: string;
  tone: string;
};

export type AdminDashboardMetricsDto = {
  totalUsers: number;
  activePaidUsers: number;
  totalRevenue: number;
  recurringRevenue: number;
  activeBatchJobs: number;
  pendingTickets: number;
  revenueChart: MonthlyRevenueDto[];
  latestTickets: SupportTicketDto[];
  recentBatchJobs: BatchJobDto[];
};

export type AdminUserDto = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  accountStatus: string;
  roles: string[];
  plan: string;
  totalJobs: number;
  monthlyApiCost: number;
  birthday: string | null;
  createdAt: string;
};

export type UpdateAdminUserRequest = {
  fullName: string;
  email: string;
  birthday: string | null;
  avatarUrl: string | null;
  accountStatus: string;
  roles: string[];
};

export type GetUsersRequest = {
  pageIndex?: number;
  pageSize?: number;
  searchTerm?: string;
  role?: string;
  plan?: string;
  status?: string;
  sortBy?: string;
  sortDesc?: boolean;
};

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
