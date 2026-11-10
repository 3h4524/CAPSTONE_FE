import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ACTION_ITEM_COPY,
  ACTION_ITEM_ICONS,
  SEVERITY_ICON_CLASSES,
} from "@/constants/seller-dashboard";
import {
  describeActionItem,
  describeWaiting,
  splitActionItems,
} from "@/helpers/seller-dashboard";
import type { ActionItem } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

type ActionInboxProps = {
  items: ActionItem[];
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * What waits on the Seller, in a side drawer so it opens over the Dashboard wherever they are:
 * failures to fix first, then work to review, as one timeline.
 */
export const ActionInbox = ({ items, isLoading, open, onOpenChange }: ActionInboxProps) => {
  const { fixNow, toReview } = splitActionItems(items);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Needs your attention</SheetTitle>
          <SheetDescription>
            {isLoading
              ? "Checking what waits on you…"
              : items.length === 0
                ? "Nothing waits on you"
                : [
                    fixNow.length > 0 && `${fixNow.length} to fix`,
                    toReview.length > 0 && `${toReview.length} to review`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {!isLoading && items.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              You&apos;re all caught up.
            </div>
          ) : (
            [
              { title: "Fix now", group: fixNow },
              { title: "To review", group: toReview },
            ]
              .filter(({ group }) => group.length > 0)
              .map(({ title, group }) => (
                <section key={title} className="mb-6 last:mb-0">
                  <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
                    {title}
                  </h3>
                  <ol className="before:bg-border relative space-y-4 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-px">
                    {group.map((item) => (
                      <ActionTimelineItem key={item.type} item={item} />
                    ))}
                  </ol>
                </section>
              ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ActionTimelineItem = ({ item }: { item: ActionItem }) => {
  const Icon = ACTION_ITEM_ICONS[item.type];
  const place = item.targets.length === 1 ? item.targets[0].label : null;

  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "ring-background relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4",
          SEVERITY_ICON_CLASSES[item.severity]
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div>
          <Link
            href={item.actionUrl}
            className="line-clamp-2 text-sm leading-snug font-medium hover:underline"
          >
            {describeActionItem(item)}
          </Link>
          <p className="text-muted-foreground truncate text-[11px]">
            {[place && `in ${place}`, describeWaiting(item.oldestAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {item.targets.length > 1 && (
          <ul className="flex flex-wrap gap-1.5">
            {item.targets.map((target) => (
              <li key={target.url}>
                <Link
                  href={target.url}
                  className="bg-muted hover:bg-muted/70 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                >
                  {target.label}
                  <span className="font-semibold tabular-nums">{target.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link
        href={item.actionUrl}
        className="text-primary hover:bg-muted inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full px-2 text-xs font-medium"
      >
        {ACTION_ITEM_COPY[item.type].action}
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </Link>
    </li>
  );
};
