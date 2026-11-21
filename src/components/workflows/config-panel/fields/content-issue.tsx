import { ShieldAlert } from "lucide-react";

// A setting the content check refused stands out in red, focused or not.
export const CONTENT_ISSUE_CLASS =
  "border-destructive bg-destructive/[0.03] ring-destructive/15 ring-[3px] focus-visible:border-destructive focus-visible:ring-destructive/25";

/** Why the content check refused a setting, right under it. */
export const ContentIssueMessage = ({ message }: { message: string }) => (
  <p role="alert" className="text-destructive flex items-start gap-1.5 text-xs leading-relaxed">
    <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
    <span>{message}</span>
  </p>
);
