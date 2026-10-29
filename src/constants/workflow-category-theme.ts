import type { WorkflowNodeCategory } from "@/types/workflow";

type WorkflowCategoryTheme = {
  frame: string;
  header: string;
  icon: string;
  chip: string;
  dot: string;
  item: string;
};

export const WORKFLOW_CATEGORY_THEME: Record<WorkflowNodeCategory, WorkflowCategoryTheme> = {
  trigger: {
    frame: "border-wf-cat-trigger-line/80",
    header: "border-wf-cat-trigger-line/60 bg-wf-cat-trigger-soft",
    icon: "text-wf-cat-trigger",
    chip: "bg-wf-cat-trigger-soft text-wf-cat-trigger",
    dot: "bg-wf-cat-trigger",
    item: "hover:bg-wf-cat-trigger-soft/70",
  },
  ai: {
    frame: "border-wf-cat-ai-line/80",
    header: "border-wf-cat-ai-line/60 bg-wf-cat-ai-soft",
    icon: "text-wf-cat-ai",
    chip: "bg-wf-cat-ai-soft text-wf-cat-ai",
    dot: "bg-wf-cat-ai",
    item: "hover:bg-wf-cat-ai-soft/70",
  },
  review: {
    frame: "border-wf-cat-review-line/80",
    header: "border-wf-cat-review-line/60 bg-wf-cat-review-soft",
    icon: "text-wf-cat-review",
    chip: "bg-wf-cat-review-soft text-wf-cat-review",
    dot: "bg-wf-cat-review",
    item: "hover:bg-wf-cat-review-soft/70",
  },
  output: {
    frame: "border-wf-cat-output-line/80",
    header: "border-wf-cat-output-line/60 bg-wf-cat-output-soft",
    icon: "text-wf-cat-output",
    chip: "bg-wf-cat-output-soft text-wf-cat-output",
    dot: "bg-wf-cat-output",
    item: "hover:bg-wf-cat-output-soft/70",
  },
};
