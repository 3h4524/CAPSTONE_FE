export type SupportTicketDto = {
  id: string;
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
  /** The batch the job runs for. */
  batchName?: string | null;
  createdAt?: string | null;
  /** What the job's AI calls cost, in USD. */
  aiCostUsd?: number;
};

export type AdminDashboardMetricsDto = {
  totalUsers: number;
  activePaidUsers: number;
  /** Collected in the selected range, in VND, as on the Revenue page. */
  totalRevenue: number;
  /** MRR today, in VND, as on the Revenue page. */
  recurringRevenue: number;
  activeBatchJobs: number;
  totalBatchJobs?: number;
  pendingTickets: number;
  latestTickets: SupportTicketDto[];
  recentBatchJobs: BatchJobDto[];
};

export type OperationsBucket = "day" | "month";

export type AdminOperationsDto = {
  /** First and last day counted (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  bucket: OperationsBucket;
  /** Work started in each bucket, empty ones included. */
  throughput: { start: string; jobs: number; products: number }[];
  /** Sellers who started a batch job in the period, and in the period just before. */
  activeSellers: number;
  previousActiveSellers: number;
  /** Products created in the period, and how many of them reached each step. */
  funnel: { products: number; designed: number; mockedUp: number; listed: number; published: number };
  /** AI calls in the period by feature, most used first. */
  aiUsage: { feature: string; calls: number; failed: number; costUsd: number }[];
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
  /** What the Seller pays a month for their plan, in VND (annual / 12; 0 on a free trial). */
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
