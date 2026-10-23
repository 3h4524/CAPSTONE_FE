import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

import { WORKFLOW_NODE_DEFINITIONS } from "@/constants/workflow";
import type { WorkflowNodeType } from "@/types/workflow";

type ApprovalFlowProps = {
  from: WorkflowNodeType;
  to: WorkflowNodeType;
  automatic: boolean;
};

// One line under the review settings: the step before, what happens here, and the step it lets through.
export const ApprovalFlow = ({ from, to, automatic }: ApprovalFlowProps) => {
  const steps = [WORKFLOW_NODE_DEFINITIONS[from].label, automatic ? "Approved automatically" : "You review", WORKFLOW_NODE_DEFINITIONS[to].label];

  return (
    <p className="text-muted-foreground -mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 px-5 pb-5 text-xs">
      {steps.map((step, index) => (
        <Fragment key={step}>
          {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden="true" />}
          <span className={index === 1 ? "font-medium text-slate-900" : undefined}>{step}</span>
        </Fragment>
      ))}
    </p>
  );
};
