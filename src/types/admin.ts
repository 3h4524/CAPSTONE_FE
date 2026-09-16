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
