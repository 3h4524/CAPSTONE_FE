"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkflowIssue } from "@/types/workflow";

const SUMMARY_LENGTH = 3;

type IssueRowProps = {
  issue: WorkflowIssue;
  onFix: (nodeId: string) => void;
};

const IssueRow = ({ issue, onFix }: IssueRowProps) => {
  const { nodeId } = issue;
  return (
    <li className="flex items-start gap-2 text-sm text-amber-900">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-snug">{issue.message}</span>
      {nodeId && (
        <button
          type="button"
          onClick={() => onFix(nodeId)}
          className="-my-2 min-h-10 shrink-0 px-1 text-xs font-semibold underline underline-offset-2"
        >
          Fix
        </button>
      )}
    </li>
  );
};

type WorkflowChecksSummaryProps = {
  issues: WorkflowIssue[];
  onFix: (nodeId: string) => void;
  onViewAll: () => void;
};

/** The first few problems above the steps, so a workflow that cannot run says so straight away. */
export const WorkflowChecksSummary = ({ issues, onFix, onViewAll }: WorkflowChecksSummaryProps) => {
  if (issues.length === 0) return null;

  return (
    <section aria-label="Workflow checks" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-amber-950">
            {issues.length} workflow {issues.length === 1 ? "check needs" : "checks need"} attention
          </h2>
          <p className="mt-0.5 text-xs text-amber-800">Fix these before you run this workflow.</p>
        </div>
        {issues.length > SUMMARY_LENGTH && (
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 bg-white px-3 text-xs" onClick={onViewAll}>
            View
          </Button>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {issues.slice(0, SUMMARY_LENGTH).map((issue) => (
          <IssueRow key={issue.id} issue={issue} onFix={onFix} />
        ))}
      </ul>
    </section>
  );
};

type WorkflowChecksListProps = {
  issues: WorkflowIssue[];
  onFix: (nodeId: string) => void;
};

/** Every problem with the workflow, each leading to the step that has it. */
export const WorkflowChecksList = ({ issues, onFix }: WorkflowChecksListProps) => {
  if (issues.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        Every step is connected and configured. Press Run to start the batch.
      </div>
    );
  }

  return (
    <ul aria-label="Workflow issues" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      {issues.map((issue) => (
        <IssueRow key={issue.id} issue={issue} onFix={onFix} />
      ))}
    </ul>
  );
};
