import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CATEGORY_LABELS, formatDateTime, formatNumber } from "@/components/admin/content-safety/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ModerationOffender } from "@/types/admin-moderation";

const userLink = (email: string) => `/admin/users?search=${encodeURIComponent(email)}`;

const headClass = "text-ink-500 text-xs font-semibold tracking-wider uppercase";

/** The sellers blocked most often, each linked to the Users page. */
export const OffendersTable = ({ offenders }: { offenders: ModerationOffender[] }) => {
  const isPhone = useIsPhone();

  if (offenders.length === 0)
    return <p className="text-ink-500 py-6 text-center text-sm">No seller was blocked in this period.</p>;

  if (isPhone)
    return (
      <ul className="space-y-2">
        {offenders.map((offender, index) => (
          <li key={offender.userId} className="border-ink-200 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ink-900 dark:text-ink-50 truncate text-sm font-semibold">
                  {index + 1}. {offender.fullName || offender.email}
                </p>
                <p className="text-ink-500 truncate text-xs">{offender.email}</p>
              </div>
              <Link
                href={userLink(offender.email)}
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300"
              >
                View <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-ink-600 mt-1 text-xs">
              {formatNumber(offender.blocked)} blocked · {formatNumber(offender.flagged)} flagged
              {offender.topCategory ? ` · mostly ${CATEGORY_LABELS[offender.topCategory]}` : ""}
            </p>
          </li>
        ))}
      </ul>
    );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${headClass} w-10`}>#</TableHead>
            <TableHead className={headClass}>Seller</TableHead>
            <TableHead className={`${headClass} text-right`}>Blocked</TableHead>
            <TableHead className={`${headClass} text-right`}>Flagged</TableHead>
            <TableHead className={headClass}>Most often</TableHead>
            <TableHead className={headClass}>Last blocked</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {offenders.map((offender, index) => (
            <TableRow key={offender.userId}>
              <TableCell className="text-ink-500 tabular-nums">{index + 1}</TableCell>
              <TableCell>
                <p className="text-ink-900 dark:text-ink-50 font-medium">{offender.fullName || "—"}</p>
                <p className="text-ink-500 text-xs">{offender.email}</p>
              </TableCell>
              <TableCell className="text-right font-semibold text-rose-700 tabular-nums dark:text-rose-300">
                {formatNumber(offender.blocked)}
              </TableCell>
              <TableCell className="text-ink-700 text-right tabular-nums">{formatNumber(offender.flagged)}</TableCell>
              <TableCell className="text-ink-700">
                {offender.topCategory ? CATEGORY_LABELS[offender.topCategory] : "—"}
              </TableCell>
              <TableCell className="text-ink-600 text-xs">{formatDateTime(offender.lastBlockedAt)}</TableCell>
              <TableCell className="text-right">
                <Link
                  href={userLink(offender.email)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
                >
                  View seller <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
