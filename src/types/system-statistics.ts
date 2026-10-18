export interface StatisticsFilterDto {
  timeRange?: string; // "7d" | "30d" | "90d" | "year"
  startDate?: string;
  endDate?: string;
}

export interface MetricValueDto {
  value: number;
  previousValue: number;
  growthPercentage: number;
}

export interface StatisticsMetricCardsDto {
  totalBatchJobs: MetricValueDto;
  imagesGenerated: MetricValueDto;
  videosRendered: MetricValueDto;
  listingsGenerated: MetricValueDto;
}

export interface DailyJobsPointDto {
  dateLabel: string;
  count: number;
}

export interface PipelineStageBreakdownDto {
  stageName: string;
  count: number;
  percentage: number;
}

export interface IntegrationStatusDto {
  etsySuccessRate: number;
  etsyTotal: number;
  etsyGrowthPercentage: number;
  printifySuccessRate: number;
  printifyTotal: number;
  printifyGrowthPercentage: number;
  socialMediaSuccessRate: number;
  socialMediaTotal: number;
  socialMediaGrowthPercentage: number;
  failedIntegrationsCount: number;
}

export interface SystemErrorLogDto {
  id: string;
  timestamp: string;
  errorType: string;
  message: string;
  source?: string;
}

export interface SystemStatisticsOverviewDto {
  metrics: StatisticsMetricCardsDto;
  dailyJobs: DailyJobsPointDto[];
  pipelineStages: PipelineStageBreakdownDto[];
  integrationStatus: IntegrationStatusDto;
  recentErrors: SystemErrorLogDto[];
}
