export type UsageOverview = {
  summary: { images: number; videos: number; listings: number; estimatedCostUsd: number };
  dailyActivity: { date: string; images: number; videos: number }[];
  allowance: {
    planName: string;
    used: number;
    limit: number;
    percent: number;
    resetDate: string;
    daysRemaining: number;
    atRisk: boolean;
  };
  costs: {
    provider: string;
    service: string;
    requests: number;
    estimatedCostUsd: number;
    sharePercent: number;
  }[];
  hasData: boolean;
};
