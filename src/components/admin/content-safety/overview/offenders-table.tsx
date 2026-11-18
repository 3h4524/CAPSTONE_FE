import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { CATEGORY_LABEL_KEYS, formatDateTime, formatNumber } from "@/components/admin/content-safety/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { ModerationOffender } from "@/types/admin-moderation";

const userLink = (email: string) => `/admin/users?search=${encodeURIComponent(email)}`;

const headClass = "text-ink-500 text-xs font-semibold tracking-wider uppercase";

/** The sellers blocked most often, each linked to the Users page. */
export const OffendersTable = ({ offenders }: { offenders: ModerationOffender[] }) => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();

  if (offenders.length === 0)
    return <p className="text-ink-500 py-6 text-center text-sm">{t("admin.contentSafety.offenders.empty")}</p>;

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
                {t("admin.contentSafety.common.view")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="text-ink-600 mt-1 text-xs">
              {t("admin.contentSafety.stats.blockedFlagged", { blocked: formatNumber(offender.blocked), flagged: formatNumber(offender.flagged) })}
              {offender.topCategory
                ? ` · ${t("admin.contentSafety.offenders.mostlyCategory", { category: t(CATEGORY_LABEL_KEYS[offender.topCategory]) })}`
                : ""}
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
            <TableHead className={headClass}>{t("admin.contentSafety.common.seller")}</TableHead>
            <TableHead className={`${headClass} text-right`}>{t("admin.contentSafety.decisions.block")}</TableHead>
            <TableHead className={`${headClass} text-right`}>{t("admin.contentSafety.decisions.flagged")}</TableHead>
            <TableHead className={headClass}>{t("admin.contentSafety.offenders.mostOften")}</TableHead>
            <TableHead className={headClass}>{t("admin.contentSafety.offenders.lastBlocked")}</TableHead>
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
                {offender.topCategory ? t(CATEGORY_LABEL_KEYS[offender.topCategory]) : "—"}
              </TableCell>
              <TableCell className="text-ink-600 text-xs">{formatDateTime(offender.lastBlockedAt)}</TableCell>
              <TableCell className="text-right">
                <Link
                  href={userLink(offender.email)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-300"
                >
                  {t("admin.contentSafety.common.viewSeller")} <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
