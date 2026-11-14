import {
  adminModerationKeys,
  getModerationAllowlist,
  getModerationCheck,
  getModerationChecks,
  getModerationOffenders,
  getModerationOverview,
  getModerationSettings,
  getModerationTerms,
} from "@/api/admin-moderation";
import { useQuery } from "@/hooks/queries/use-query";
import type { ModerationCheckFilter, ModerationRangeDays, ModerationTermFilter } from "@/types/admin-moderation";
import { keepPreviousData } from "@tanstack/react-query";

export const useModerationOverview = (days: ModerationRangeDays) =>
  useQuery({ queryKey: adminModerationKeys.overview(days), queryFn: () => getModerationOverview(days) });

export const useModerationOffenders = (days: ModerationRangeDays) =>
  useQuery({ queryKey: adminModerationKeys.offenders(days), queryFn: () => getModerationOffenders(days) });

// The previous page stays on screen while the next one loads, so the table does not jump.
export const useModerationChecks = (filter: ModerationCheckFilter) =>
  useQuery({
    queryKey: adminModerationKeys.checks(filter),
    queryFn: () => getModerationChecks(filter),
    placeholderData: keepPreviousData,
  });

export const useModerationCheck = (id: string | null) =>
  useQuery({
    queryKey: adminModerationKeys.check(id ?? ""),
    queryFn: () => getModerationCheck(id!),
    enabled: Boolean(id),
  });

export const useModerationTerms = (filter: ModerationTermFilter) =>
  useQuery({
    queryKey: adminModerationKeys.terms(filter),
    queryFn: () => getModerationTerms(filter),
    placeholderData: keepPreviousData,
  });

export const useModerationAllowlist = () =>
  useQuery({ queryKey: adminModerationKeys.allowlist(), queryFn: getModerationAllowlist });

export const useModerationSettings = () =>
  useQuery({ queryKey: adminModerationKeys.settings(), queryFn: getModerationSettings });
